import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatternAnalysis {
  leadPatterns: {
    commonSources: { source: string; count: number }[];
    statusTransitions: { from: string; to: string; count: number }[];
    avgTimeToQualify: number | null;
  };
  opportunityPatterns: {
    stageTransitions: { from: string; to: string; count: number; avgDays: number }[];
    commonValues: { min: number; max: number; avg: number } | null;
    winRate: number | null;
  };
  customFieldPatterns: {
    fieldId: string;
    fieldName: string;
    mostCommonValues: { value: string; count: number }[];
    updateFrequency: number;
  }[];
  existingAutomations: {
    id: string;
    name: string;
    trigger: string;
    conditionFields: string[];
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

serve(async (req) => {
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
    ] = await Promise.all([
      supabase
        .from("leads")
        .select("id, name, source, status, created_at, updated_at")
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
        .select("id, name, field_type, entity_type")
        .eq("workspace_id", workspaceId),
      supabase
        .from("custom_field_values")
        .select("custom_field_id, entity_id, value, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase
        .from("automation_rules")
        .select(`
          id, name, trigger,
          conditions:automation_conditions(field_name)
        `)
        .eq("workspace_id", workspaceId),
      supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true }),
    ]);

    const leads = leadsResult.data || [];
    const opportunities = opportunitiesResult.data || [];
    const customFields = customFieldsResult.data || [];
    const customFieldValues = customFieldValuesResult.data || [];
    const automationRules = automationRulesResult.data || [];
    const pipelineStages = pipelineStagesResult.data || [];

    // Analyze patterns
    const patternAnalysis: PatternAnalysis = {
      leadPatterns: analyzeLeadPatterns(leads),
      opportunityPatterns: analyzeOpportunityPatterns(opportunities, pipelineStages),
      customFieldPatterns: analyzeCustomFieldPatterns(customFields, customFieldValues),
      existingAutomations: automationRules.map((r: any) => ({
        id: r.id,
        name: r.name,
        trigger: r.trigger,
        conditionFields: r.conditions?.map((c: any) => c.field_name) || [],
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

    // Call AI to generate suggestions
    const systemPrompt = `You are an AI assistant that analyzes CRM usage patterns and suggests automation rules.

You will receive pattern analysis data from a CRM system including:
- Lead creation and status patterns
- Opportunity stage transitions
- Custom field usage patterns
- Existing automation rules (to avoid duplication)

Your task is to identify repetitive patterns that could be automated and suggest new automation rules.

RULES:
1. Only suggest automations with HIGH confidence (>= 0.7) when a clear repetitive pattern exists
2. Never duplicate existing automations - check the existingAutomations list
3. Each suggestion must be actionable and specific
4. Prefer simple automations over complex ones
5. Focus on patterns that save significant manual work

Available triggers: lead_created, lead_updated, opportunity_created, opportunity_updated, opportunity_stage_changed, contact_created, contact_updated, company_created, company_updated, custom_field_updated, payment_confirmed

Available actions: create_task, assign_owner, move_opportunity_stage, add_tag, send_message, notify_user, create_opportunity, update_field

Available condition operators: equals, not_equals, contains, not_contains, greater_than, less_than, is_empty, is_not_empty

Return suggestions only when you find strong patterns. It's better to return 0 suggestions than low-quality ones.`;

    const userPrompt = `Analyze these CRM patterns and suggest automation rules:

${JSON.stringify(patternAnalysis, null, 2)}

Pipeline Stages (in order): ${pipelineStages.map((s: any) => `${s.name} (${s.id})`).join(" → ")}

Return your suggestions using the suggest_automations function. Only include high-confidence suggestions based on clear patterns.`;

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
                              field_name: { type: "string" },
                              operator: {
                                type: "string",
                                enum: ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"],
                              },
                              value: { type: "string" },
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
                              config: { type: "object" },
                            },
                            required: ["action_type", "config"],
                          },
                        },
                        confidence: {
                          type: "number",
                          minimum: 0,
                          maximum: 1,
                          description: "Confidence score based on pattern strength (0-1)",
                        },
                        explanation: {
                          type: "string",
                          description: "Detailed explanation of why this automation is suggested and what pattern was detected",
                        },
                        pattern_evidence: {
                          type: "object",
                          description: "Data supporting this suggestion",
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
    const suggestions: AutomationSuggestion[] = (parsed.suggestions || [])
      .filter((s: any) => s.confidence >= 0.7) // Only high confidence
      .map((s: any) => ({
        title: s.title,
        description: s.description,
        trigger_type: s.trigger_type,
        trigger_config: {},
        conditions: s.conditions || [],
        actions: s.actions || [],
        confidence: s.confidence,
        explanation: s.explanation,
        pattern_data: s.pattern_evidence || {},
      }));

    // Store suggestions in database
    if (suggestions.length > 0) {
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
          suggestions.map((s) => ({
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
        suggestions,
        patternsAnalyzed: {
          leads: leads.length,
          opportunities: opportunities.length,
          customFields: customFields.length,
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

  leads.forEach((lead) => {
    if (lead.source) {
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    }
    if (lead.status) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }
  });

  const commonSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Simplified status transitions (would need historical data for real analysis)
  const statusTransitions: { from: string; to: string; count: number }[] = [];

  return {
    commonSources,
    statusTransitions,
    avgTimeToQualify: null,
  };
}

function analyzeOpportunityPatterns(opportunities: any[], stages: any[]) {
  const stageMap = new Map(stages.map((s) => [s.id, s.name]));
  const stageCounts: Record<string, number> = {};
  const values = opportunities.filter((o) => o.value != null).map((o) => Number(o.value));

  opportunities.forEach((opp) => {
    const stageName = stageMap.get(opp.stage_id) || opp.stage_id;
    stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;
  });

  const won = opportunities.filter((o) => o.status === "won").length;
  const closed = opportunities.filter((o) => ["won", "lost"].includes(o.status)).length;

  return {
    stageTransitions: [], // Would need historical data
    commonValues: values.length > 0
      ? {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        }
      : null,
    winRate: closed > 0 ? won / closed : null,
  };
}

function analyzeCustomFieldPatterns(customFields: any[], values: any[]) {
  const patterns: PatternAnalysis["customFieldPatterns"] = [];

  customFields.forEach((field) => {
    const fieldValues = values.filter((v) => v.custom_field_id === field.id);
    const valueCounts: Record<string, number> = {};

    fieldValues.forEach((v) => {
      const strValue = String(v.value);
      valueCounts[strValue] = (valueCounts[strValue] || 0) + 1;
    });

    const mostCommonValues = Object.entries(valueCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (fieldValues.length > 0) {
      patterns.push({
        fieldId: field.id,
        fieldName: field.name,
        mostCommonValues,
        updateFrequency: fieldValues.length,
      });
    }
  });

  return patterns;
}
