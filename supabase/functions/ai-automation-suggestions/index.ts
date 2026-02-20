import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Field type to valid operators mapping
const FIELD_TYPE_OPERATORS: Record<string, string[]> = {
  text: ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  textarea: ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  number: ["equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty"],
  select: ["equals", "not_equals", "is_empty", "is_not_empty"],
  multiselect: ["contains", "not_contains", "is_empty", "is_not_empty"],
  boolean: ["equals"],
  date: ["equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty"],
  url: ["equals", "not_equals", "contains", "is_empty", "is_not_empty"],
  email: ["equals", "not_equals", "contains", "is_empty", "is_not_empty"],
};

// Core fields and their types per entity
const CORE_FIELDS: Record<string, Record<string, string>> = {
  lead: {
    name: "text",
    email: "email",
    phone: "text",
    source: "select",
    status: "select",
    tags: "multiselect",
  },
  opportunity: {
    title: "text",
    value: "number",
    status: "select",
    stage_id: "select",
    expected_close_date: "date",
  },
  contact: {
    name: "text",
    email: "email",
    phone: "text",
    company: "text",
    job_title: "text",
    tags: "multiselect",
  },
  company: {
    name: "text",
    email: "email",
    phone: "text",
    website: "url",
    industry: "select",
    size: "select",
    tags: "multiselect",
  },
};

// Actions that modify entities (could cause loops)
const MODIFYING_ACTIONS = [
  "move_opportunity_stage",
  "add_tag",
  "update_field",
  "assign_owner",
];

// Triggers that fire on entity updates
const UPDATE_TRIGGERS = [
  "lead_updated",
  "opportunity_updated",
  "opportunity_stage_changed",
  "contact_updated",
  "company_updated",
  "custom_field_updated",
];

interface CustomFieldDefinition {
  id: string;
  name: string;
  field_type: string;
  entity_type: string;
  options?: { label: string; value: string }[] | null;
}

interface PatternAnalysis {
  leadPatterns: {
    commonSources: { source: string; count: number }[];
    statusDistribution: { status: string; count: number }[];
    tagPatterns: { tag: string; count: number }[];
    recentActivity: number;
  };
  opportunityPatterns: {
    stageDistribution: { stage: string; stageId: string; count: number }[];
    valueRanges: { min: number; max: number; avg: number } | null;
    winRate: number | null;
    avgDaysInPipeline: number | null;
  };
  customFieldPatterns: {
    fieldId: string;
    fieldName: string;
    fieldType: string;
    entityType: string;
    options: string[] | null;
    validOperators: string[];
    mostCommonValues: { value: string; count: number }[];
    updateFrequency: number;
    fillRate: number;
  }[];
  existingAutomations: {
    id: string;
    name: string;
    trigger: string;
    isActive: boolean;
    conditionFields: string[];
    actionTypes: string[];
  }[];
}

interface AutomationSuggestion {
  title: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  confidence: number;
  explanation: string;
  pattern_data: Record<string, unknown>;
}

// Detect potential loop risks
function detectLoopRisk(
  trigger: string,
  actions: Array<{ action_type: string; config: Record<string, unknown> }>,
  existingAutomations: PatternAnalysis["existingAutomations"]
): { hasRisk: boolean; reason?: string } {
  // Check if this automation could trigger itself
  const isUpdateTrigger = UPDATE_TRIGGERS.includes(trigger);
  const hasModifyingAction = actions.some((a) => MODIFYING_ACTIONS.includes(a.action_type));

  if (isUpdateTrigger && hasModifyingAction) {
    // Check if the action could trigger the same trigger
    const triggerEntity = trigger.split("_")[0]; // e.g., "lead" from "lead_updated"
    
    for (const action of actions) {
      if (action.action_type === "update_field") {
        // update_field on same entity type could cause loop
        return {
          hasRisk: true,
          reason: `Atualizar campo em ${triggerEntity} poderia causar loop infinito com trigger ${trigger}`,
        };
      }
      if (action.action_type === "add_tag" && trigger.includes(triggerEntity)) {
        // Adding tag to same entity could trigger lead_updated
        return {
          hasRisk: true,
          reason: `Adicionar tag poderia re-disparar o trigger ${trigger}`,
        };
      }
    }
  }

  // Check for chain reactions with existing automations
  for (const existing of existingAutomations) {
    if (!existing.isActive) continue;
    
    // Check if our actions could trigger an existing automation that triggers back
    for (const action of actions) {
      if (action.action_type === "move_opportunity_stage" && 
          existing.trigger === "opportunity_stage_changed") {
        // Check if existing automation could trigger us back
        const couldTriggerBack = existing.actionTypes.some((a) => 
          a === "move_opportunity_stage" || a === "update_field"
        );
        if (couldTriggerBack) {
          return {
            hasRisk: true,
            reason: `Poderia criar loop com automação existente "${existing.name}"`,
          };
        }
      }
    }
  }

  return { hasRisk: false };
}

// Check for conflicts with existing automations
function detectConflict(
  trigger: string,
  conditions: Array<{ field_name: string; operator: string; value: string | null }>,
  existingAutomations: PatternAnalysis["existingAutomations"]
): { hasConflict: boolean; conflictingRule?: string } {
  for (const existing of existingAutomations) {
    if (existing.trigger !== trigger) continue;
    
    // Check if conditions overlap significantly
    const conditionFields = conditions.map((c) => c.field_name);
    const overlap = conditionFields.filter((f) => 
      existing.conditionFields.includes(f)
    );
    
    // If >50% of condition fields overlap, likely duplicate
    if (overlap.length > 0 && overlap.length >= conditions.length * 0.5) {
      return {
        hasConflict: true,
        conflictingRule: existing.name,
      };
    }
  }
  
  return { hasConflict: false };
}

// Validate and fix operator for field type
function validateConditions(
  conditions: Array<{ field_name: string; operator: string; value: string | null }>,
  customFields: CustomFieldDefinition[],
  entityType: string
): Array<{ field_name: string; operator: string; value: string | null }> {
  return conditions.map((condition) => {
    let fieldType = "text"; // default
    
    // Check if it's a core field
    const coreFields = CORE_FIELDS[entityType] || {};
    if (coreFields[condition.field_name]) {
      fieldType = coreFields[condition.field_name];
    } else {
      // Check custom fields
      const customField = customFields.find(
        (cf) => cf.name === condition.field_name || cf.id === condition.field_name
      );
      if (customField) {
        fieldType = customField.field_type;
      }
    }
    
    // Get valid operators for this field type
    const validOperators = FIELD_TYPE_OPERATORS[fieldType] || FIELD_TYPE_OPERATORS.text;
    
    // If operator is invalid for field type, use first valid operator
    if (!validOperators.includes(condition.operator)) {
      console.log(`Fixing invalid operator "${condition.operator}" for field type "${fieldType}"`);
      return {
        ...condition,
        operator: validOperators[0],
      };
    }
    
    // Validate boolean values
    if (fieldType === "boolean" && condition.value) {
      const normalizedValue = condition.value.toLowerCase();
      if (!["true", "false"].includes(normalizedValue)) {
        return { ...condition, value: "true" };
      }
    }
    
    return condition;
  });
}

// Get entity type from trigger
function getEntityTypeFromTrigger(trigger: string): string {
  if (trigger.startsWith("lead")) return "lead";
  if (trigger.startsWith("opportunity")) return "opportunity";
  if (trigger.startsWith("contact")) return "contact";
  if (trigger.startsWith("company")) return "company";
  if (trigger === "custom_field_updated") return "lead"; // Default to lead
  return "lead";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch data for pattern analysis in parallel
    const [
      leadsResult,
      opportunitiesResult,
      customFieldsResult,
      customFieldValuesResult,
      automationRulesResult,
      pipelineStagesResult,
      contactsResult,
      companiesResult,
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, source, status, tags, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("opportunities")
        .select("id, title, value, status, stage_id, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("custom_fields")
        .select("id, name, field_type, entity_type, options")
        .eq("workspace_id", workspaceId),
      supabase
        .from("custom_field_values")
        .select("custom_field_id, entity_id, value, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase
        .from("automation_rules")
        .select(`
          id, name, trigger, is_active,
          conditions:automation_conditions(field_name),
          actions:automation_actions(action_type)
        `)
        .eq("workspace_id", workspaceId),
      supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true }),
      supabase
        .from("contacts")
        .select("id, tags")
        .eq("workspace_id", workspaceId)
        .limit(500),
      supabase
        .from("companies")
        .select("id, industry, size, tags")
        .eq("workspace_id", workspaceId)
        .limit(500),
    ]);

    const leads = leadsResult.data || [];
    const opportunities = opportunitiesResult.data || [];
    const customFields: CustomFieldDefinition[] = customFieldsResult.data || [];
    const customFieldValues = customFieldValuesResult.data || [];
    const automationRules = automationRulesResult.data || [];
    const pipelineStages = pipelineStagesResult.data || [];
    const contacts = contactsResult.data || [];
    const companies = companiesResult.data || [];

    // Build custom field definitions with valid operators
    const customFieldDefinitions = customFields.map((cf) => ({
      ...cf,
      validOperators: FIELD_TYPE_OPERATORS[cf.field_type] || FIELD_TYPE_OPERATORS.text,
      options: cf.options ? (cf.options as any[]).map((o: any) => o.label || o.value || String(o)) : null,
    }));

    // Analyze patterns
    const patternAnalysis: PatternAnalysis = {
      leadPatterns: analyzeLeadPatterns(leads),
      opportunityPatterns: analyzeOpportunityPatterns(opportunities, pipelineStages),
      customFieldPatterns: analyzeCustomFieldPatterns(customFieldDefinitions, customFieldValues, leads.length + contacts.length + companies.length),
      existingAutomations: automationRules.map((r: any) => ({
        id: r.id,
        name: r.name,
        trigger: r.trigger,
        isActive: r.is_active,
        conditionFields: r.conditions?.map((c: any) => c.field_name) || [],
        actionTypes: r.actions?.map((a: any) => a.action_type) || [],
      })),
    };

    // Check if there's enough data to analyze
    const hasEnoughData = leads.length >= 10 || opportunities.length >= 5;
    if (!hasEnoughData) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          message: "Não há dados suficientes para análise. Continue a usar o CRM e volte mais tarde.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build comprehensive prompt with custom field info
    const customFieldsInfo = customFieldDefinitions.length > 0
      ? `\n\nCUSTOM FIELDS AVAILABLE:\n${customFieldDefinitions.map((cf) => 
          `- ${cf.name} (${cf.field_type}, entity: ${cf.entity_type})${cf.options ? ` [options: ${cf.options.join(", ")}]` : ""}\n  Valid operators: ${cf.validOperators.join(", ")}`
        ).join("\n")}`
      : "";

    const systemPrompt = `You are an AI assistant that analyzes CRM usage patterns and suggests automation rules.

You will receive pattern analysis data from a CRM system including:
- Lead creation and status patterns
- Opportunity stage distributions
- Custom field usage patterns (with field types and valid operators)
- Existing automation rules (to avoid duplication and loops)

Your task is to identify repetitive patterns that could be automated and suggest new automation rules.

CRITICAL RULES:
1. Only suggest automations with HIGH confidence (>= 0.7) when a clear repetitive pattern exists
2. NEVER duplicate existing automations - check the existingAutomations list carefully
3. RESPECT FIELD TYPES: Use only valid operators for each field type:
   - text/textarea: equals, not_equals, contains, not_contains, is_empty, is_not_empty
   - number: equals, not_equals, greater_than, less_than, is_empty, is_not_empty
   - select: equals, not_equals, is_empty, is_not_empty
   - multiselect: contains, not_contains, is_empty, is_not_empty
   - boolean: equals (with value "true" or "false" only)
   - date: equals, not_equals, greater_than, less_than, is_empty, is_not_empty
4. PREVENT LOOPS: Never suggest automations where:
   - An update trigger (lead_updated, opportunity_updated, etc.) has actions that modify the same entity type
   - The action could cause an existing automation to fire back
5. For custom fields, use the exact field name as field_name in conditions
6. Each suggestion must be actionable and specific
7. Prefer simple automations over complex ones
${customFieldsInfo}

Available triggers: lead_created, lead_updated, opportunity_created, opportunity_updated, opportunity_stage_changed, contact_created, contact_updated, company_created, company_updated, custom_field_updated, payment_confirmed

Available actions: create_task, assign_owner, move_opportunity_stage, add_tag, send_message, notify_user, create_opportunity, update_field

Return suggestions only when you find strong patterns. It's better to return 0 suggestions than low-quality ones.`;

    const userPrompt = `Analyze these CRM patterns and suggest automation rules:

${JSON.stringify(patternAnalysis, null, 2)}

Pipeline Stages (in order): ${pipelineStages.map((s: any) => `${s.name} (${s.id})`).join(" → ")}

Core fields by entity:
- Lead: name (text), email (email), phone (text), source (select), status (select), tags (multiselect)
- Opportunity: title (text), value (number), status (select), stage_id (select), expected_close_date (date)
- Contact: name (text), email (email), phone (text), company (text), job_title (text), tags (multiselect)
- Company: name (text), email (email), phone (text), website (url), industry (select), size (select), tags (multiselect)

Return your suggestions using the suggest_automations function. Only include high-confidence suggestions based on clear patterns. Remember to use valid operators for each field type!`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_automations",
              description: "Return automation suggestions based on detected patterns",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Clear, concise title for the automation",
                        },
                        description: {
                          type: "string",
                          description: "Human-readable description of what this automation does",
                        },
                        trigger_type: {
                          type: "string",
                          enum: [
                            "lead_created", "lead_updated", "opportunity_created",
                            "opportunity_updated", "opportunity_stage_changed",
                            "contact_created", "contact_updated", "company_created",
                            "company_updated", "custom_field_updated", "payment_confirmed",
                          ],
                        },
                        conditions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              field_name: { 
                                type: "string",
                                description: "Core field name or custom field name exactly as defined",
                              },
                              operator: {
                                type: "string",
                                enum: ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"],
                              },
                              value: { 
                                type: "string",
                                description: "Value to compare. For boolean fields, use 'true' or 'false' only.",
                              },
                            },
                            required: ["field_name", "operator"],
                          },
                        },
                        actions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              action_type: {
                                type: "string",
                                enum: ["create_task", "assign_owner", "move_opportunity_stage", "add_tag", "send_message", "notify_user", "create_opportunity", "update_field"],
                              },
                              config: { 
                                type: "object",
                                description: "Action configuration. E.g., for create_task: {title, due_days}, for add_tag: {tag}, for move_opportunity_stage: {stage_id}",
                              },
                            },
                            required: ["action_type", "config"],
                          },
                        },
                        confidence: {
                          type: "number",
                          minimum: 0,
                          maximum: 1,
                          description: "Confidence score based on pattern strength (0-1). Must be >= 0.7",
                        },
                        explanation: {
                          type: "string",
                          description: "Detailed explanation of why this automation is suggested, including the specific pattern detected and data supporting it",
                        },
                        pattern_evidence: {
                          type: "object",
                          description: "Data supporting this suggestion (e.g., counts, percentages)",
                        },
                      },
                      required: ["title", "description", "trigger_type", "conditions", "actions", "confidence", "explanation"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_automations" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("AI API error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ suggestions: [], message: "No patterns detected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    
    // Process and validate suggestions
    const validatedSuggestions: AutomationSuggestion[] = [];
    const rejectedSuggestions: Array<{ title: string; reason: string }> = [];
    
    for (const s of (parsed.suggestions || [])) {
      // Skip low confidence
      if (s.confidence < 0.7) {
        rejectedSuggestions.push({ title: s.title, reason: "Low confidence" });
        continue;
      }
      
      const entityType = getEntityTypeFromTrigger(s.trigger_type);
      
      // Validate and fix conditions
      const validatedConditions = validateConditions(
        s.conditions || [],
        customFields,
        entityType
      );
      
      // Check for loops
      const loopCheck = detectLoopRisk(
        s.trigger_type,
        s.actions || [],
        patternAnalysis.existingAutomations
      );
      if (loopCheck.hasRisk) {
        rejectedSuggestions.push({ title: s.title, reason: loopCheck.reason! });
        continue;
      }
      
      // Check for conflicts
      const conflictCheck = detectConflict(
        s.trigger_type,
        validatedConditions,
        patternAnalysis.existingAutomations
      );
      if (conflictCheck.hasConflict) {
        rejectedSuggestions.push({ 
          title: s.title, 
          reason: `Conflicts with existing rule: ${conflictCheck.conflictingRule}` 
        });
        continue;
      }
      
      validatedSuggestions.push({
        title: s.title,
        description: s.description,
        trigger_type: s.trigger_type,
        trigger_config: {},
        conditions: validatedConditions,
        actions: s.actions || [],
        confidence: s.confidence,
        explanation: s.explanation,
        pattern_data: s.pattern_evidence || {},
      });
    }

    console.log("Validated suggestions:", validatedSuggestions.length);
    console.log("Rejected suggestions:", rejectedSuggestions);

    // Store suggestions in database
    if (validatedSuggestions.length > 0) {
      // Expire old pending suggestions first
      await supabase
        .from("automation_suggestions")
        .update({ status: "expired" })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending");

      // Insert new suggestions
      const { error: insertError } = await supabase
        .from("automation_suggestions")
        .insert(
          validatedSuggestions.map((s) => ({
            workspace_id: workspaceId,
            ...s,
          }))
        );

      if (insertError) {
        console.error("Error storing suggestions:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        suggestions: validatedSuggestions,
        rejected: rejectedSuggestions,
        patternsAnalyzed: {
          leads: leads.length,
          opportunities: opportunities.length,
          customFields: customFields.length,
          contacts: contacts.length,
          companies: companies.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-automation-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function analyzeLeadPatterns(leads: any[]) {
  const sourceCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  leads.forEach((lead) => {
    if (lead.source) {
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    }
    if (lead.status) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }
    if (lead.tags && Array.isArray(lead.tags)) {
      lead.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const commonSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const statusDistribution = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const tagPatterns = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Count leads created in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentActivity = leads.filter((l) => new Date(l.created_at) > weekAgo).length;

  return {
    commonSources,
    statusDistribution,
    tagPatterns,
    recentActivity,
  };
}

function analyzeOpportunityPatterns(opportunities: any[], stages: any[]) {
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));
  const stageCounts: Record<string, { count: number; stageId: string }> = {};
  const values = opportunities.filter((o) => o.value != null).map((o) => Number(o.value));

  opportunities.forEach((opp) => {
    const stageName = stageMap.get(opp.stage_id) || opp.stage_id;
    if (!stageCounts[stageName]) {
      stageCounts[stageName] = { count: 0, stageId: opp.stage_id };
    }
    stageCounts[stageName].count++;
  });

  const stageDistribution = Object.entries(stageCounts)
    .map(([stage, data]) => ({ stage, stageId: data.stageId, count: data.count }));

  const won = opportunities.filter((o) => o.status === "won").length;
  const closed = opportunities.filter((o) => ["won", "lost"].includes(o.status)).length;

  return {
    stageDistribution,
    valueRanges: values.length > 0
      ? {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        }
      : null,
    winRate: closed > 0 ? Math.round((won / closed) * 100) / 100 : null,
    avgDaysInPipeline: null,
  };
}

function analyzeCustomFieldPatterns(
  customFields: Array<CustomFieldDefinition & { validOperators: string[] }>,
  values: any[],
  totalEntities: number
) {
  const patterns: PatternAnalysis["customFieldPatterns"] = [];

  customFields.forEach((field) => {
    const fieldValues = values.filter((v) => v.custom_field_id === field.id);
    const valueCounts: Record<string, number> = {};

    fieldValues.forEach((v) => {
      let strValue: string;
      if (typeof v.value === "object" && v.value !== null) {
        strValue = JSON.stringify(v.value);
      } else {
        strValue = String(v.value);
      }
      valueCounts[strValue] = (valueCounts[strValue] || 0) + 1;
    });

    const mostCommonValues = Object.entries(valueCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate fill rate (how often this field is filled)
    const uniqueEntities = new Set(fieldValues.map((v) => v.entity_id)).size;
    const fillRate = totalEntities > 0 ? Math.round((uniqueEntities / totalEntities) * 100) / 100 : 0;

    // Extract option labels as strings
    let optionLabels: string[] | null = null;
    if (field.options && Array.isArray(field.options)) {
      optionLabels = (field.options as any[]).map((o: any) => 
        typeof o === 'string' ? o : (o.label || o.value || String(o))
      );
    }

    patterns.push({
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.field_type,
      entityType: field.entity_type,
      options: optionLabels,
      validOperators: field.validOperators,
      mostCommonValues,
      updateFrequency: fieldValues.length,
      fillRate,
    });
  });

  return patterns;
}
