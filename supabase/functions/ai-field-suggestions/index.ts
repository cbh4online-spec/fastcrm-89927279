import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FieldSuggestionRequest {
  entityType: "lead" | "opportunity" | "contact" | "company";
  entityId: string;
  workspaceId: string;
}

interface FieldSuggestion {
  fieldName: string;
  fieldType: "standard" | "custom";
  customFieldId?: string;
  suggestedValue: unknown;
  confidence: number;
  explanation: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { entityType, entityId, workspaceId }: FieldSuggestionRequest = await req.json();

    if (!entityType || !entityId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: entityType, entityId, workspaceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client with service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gather context data in parallel
    const contextPromises: Promise<unknown>[] = [];

    // 1. Get entity data
    let entityData: Record<string, unknown> | null = null;
    if (entityType === "lead") {
      const { data } = await supabase.from("leads").select("*").eq("id", entityId).single();
      entityData = data;
    } else if (entityType === "opportunity") {
      const { data } = await supabase.from("opportunities").select("*, leads(*)").eq("id", entityId).single();
      entityData = data;
    } else if (entityType === "contact") {
      const { data } = await supabase.from("contacts").select("*").eq("id", entityId).single();
      entityData = data;
    } else if (entityType === "company") {
      const { data } = await supabase.from("companies").select("*").eq("id", entityId).single();
      entityData = data;
    }

    if (!entityData) {
      return new Response(
        JSON.stringify({ error: "Entity not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get custom fields definitions for this entity type
    const { data: customFields } = await supabase
      .from("custom_fields")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", entityType);

    // 3. Get existing custom field values
    const { data: customFieldValues } = await supabase
      .from("custom_field_values")
      .select("*, custom_fields(*)")
      .eq("entity_id", entityId);

    // 4. Get related conversations/messages for leads
    let conversationMessages: Array<{ direction: string; content: string }> = [];
    if (entityType === "lead") {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("lead_id", entityId)
        .limit(5);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        const { data: messages } = await supabase
          .from("messages")
          .select("direction, content, sent_at")
          .in("conversation_id", conversationIds)
          .order("sent_at", { ascending: false })
          .limit(50);

        if (messages) {
          conversationMessages = messages;
        }
      }
    }

    // Build context for AI
    const context = {
      entityType,
      currentData: entityData,
      customFieldDefinitions: customFields || [],
      existingCustomFieldValues: customFieldValues || [],
      conversationHistory: conversationMessages.length > 0 
        ? conversationMessages.map(m => `[${m.direction}]: ${m.content}`).join("\n")
        : null,
    };

    // Format custom field definitions with type info for better AI understanding
    const formattedCustomFields = (customFields || []).map(cf => ({
      id: cf.id,
      name: cf.name,
      field_type: cf.field_type,
      required: cf.required,
      // For select fields, include allowed options
      allowed_options: cf.field_type === 'select' ? cf.options : undefined,
      // Add type hints for AI
      value_format: cf.field_type === 'date' ? 'ISO 8601 date string (YYYY-MM-DD)' :
                   cf.field_type === 'number' ? 'Numeric value' :
                   cf.field_type === 'boolean' ? 'true or false' :
                   cf.field_type === 'select' ? `One of: ${(cf.options || []).join(', ')}` :
                   'Text string'
    }));

    // Build the system prompt with enhanced custom field instructions
    const systemPrompt = `You are an AI assistant for a CRM system. Your job is to analyze available data and suggest values for empty or incomplete fields.

IMPORTANT RULES:
1. NEVER suggest values for fields that already have data
2. Only suggest values when you have high confidence based on actual data
3. Each suggestion must include a confidence score (0-1) and brief explanation
4. Analyze conversation messages carefully for contact info, company names, etc.

CUSTOM FIELD RULES (CRITICAL):
5. For "select" type custom fields, you MUST ONLY suggest values from the allowed_options list. Never suggest values outside this list.
6. For "date" type custom fields, suggest dates in ISO 8601 format (YYYY-MM-DD)
7. For "number" type custom fields, suggest numeric values only
8. For "boolean" type custom fields, suggest true or false only
9. For "text" type custom fields, suggest appropriate text strings
10. Always include the custom field's ID as customFieldId when suggesting custom field values
11. Use the custom field's name as the fieldName

Available entity types and their standard fields:
- lead: name, email, phone, source, status, tags
- opportunity: title, value, stage_id, expected_close_date, notes
- contact: name, email, phone, company, job_title, notes
- company: name, email, phone, website, industry, size, address

You MUST use the suggest_field_values tool to provide your analysis.`;

    const userContent = `Analyze this ${entityType} and suggest values for empty fields:

Current Data:
${JSON.stringify(context.currentData, null, 2)}

Custom Field Definitions (with type constraints):
${JSON.stringify(formattedCustomFields, null, 2)}

Existing Custom Field Values:
${JSON.stringify(context.existingCustomFieldValues, null, 2)}

${context.conversationHistory ? `Recent Conversation Messages:\n${context.conversationHistory}` : "No conversation data available."}

IMPORTANT: 
- For standard fields, set fieldType to "standard"
- For custom fields, set fieldType to "custom" and include the customFieldId
- For select-type custom fields, ONLY suggest values from the allowed_options list
- Focus on fields where you have evidence from the data provided`;

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_field_values",
              description: "Suggest values for empty fields based on available data",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        fieldName: { 
                          type: "string", 
                          description: "Name of the field to fill" 
                        },
                        fieldType: { 
                          type: "string", 
                          enum: ["standard", "custom"],
                          description: "Whether this is a standard or custom field"
                        },
                        customFieldId: {
                          type: "string",
                          description: "ID of the custom field (only for custom fields)"
                        },
                        suggestedValue: { 
                          description: "The suggested value for the field"
                        },
                        confidence: { 
                          type: "number", 
                          description: "Confidence score from 0 to 1" 
                        },
                        explanation: { 
                          type: "string", 
                          description: "Brief explanation for why this value is suggested" 
                        }
                      },
                      required: ["fieldName", "fieldType", "suggestedValue", "confidence", "explanation"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_field_values" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    
    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const suggestions: FieldSuggestion[] = result.suggestions || [];

    // Filter out suggestions for fields that already have values
    const filteredSuggestions = suggestions.filter(s => {
      if (s.fieldType === "standard") {
        const currentValue = entityData?.[s.fieldName as keyof typeof entityData];
        return currentValue === null || currentValue === undefined || currentValue === "";
      }
      // For custom fields, check if there's already a value
      const existingValue = customFieldValues?.find(
        cfv => cfv.custom_field_id === s.customFieldId
      );
      return !existingValue || existingValue.value === null;
    });

    // Store suggestions in the database
    if (filteredSuggestions.length > 0) {
      // First, mark old pending suggestions as expired
      await supabase
        .from("ai_field_suggestions")
        .update({ status: "expired" })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "pending");

      // Insert new suggestions
      const insertData = filteredSuggestions.map(s => ({
        workspace_id: workspaceId,
        entity_type: entityType,
        entity_id: entityId,
        field_name: s.fieldName,
        field_type: s.fieldType,
        custom_field_id: s.customFieldId || null,
        suggested_value: s.suggestedValue,
        confidence: s.confidence,
        explanation: s.explanation,
        source_context: {
          hasConversations: conversationMessages.length > 0,
          customFieldsCount: customFields?.length || 0,
        },
      }));

      await supabase.from("ai_field_suggestions").insert(insertData);
    }

    return new Response(
      JSON.stringify({ 
        suggestions: filteredSuggestions,
        context: {
          hasConversations: conversationMessages.length > 0,
          customFieldsAnalyzed: customFields?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Field suggestions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
