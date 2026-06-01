import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntityTagsRequest {
  entity_type: 'contact' | 'lead' | 'company' | 'opportunity';
  entity_id: string;
  workspace_id: string;
}

const TABLE_MAP: Record<string, string> = {
  contact: 'contacts',
  lead: 'leads',
  company: 'companies',
  opportunity: 'opportunities',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_type, entity_id, workspace_id }: EntityTagsRequest = await req.json();

    if (!entity_type || !entity_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing entity_type, entity_id, or workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI Gate
    const gate = await aiGate(workspace_id, 'micro', 'ai-entity-tags');
    if (!gate.allowed) {
      return new Response(
        JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const table = TABLE_MAP[entity_type];
    if (!table) throw new Error(`Invalid entity_type: ${entity_type}`);

    // 1. Fetch entity
    const { data: entity, error: entityErr } = await supabase
      .from(table)
      .select('*')
      .eq('id', entity_id)
      .single();
    if (entityErr || !entity) throw new Error(`Entity not found: ${entity_id}`);

    const existingTags: string[] = entity.tags ?? [];

    // 2. Get workspace tag vocabulary
    const { data: tagSamples } = await supabase
      .from(table)
      .select('tags')
      .eq('workspace_id', workspace_id)
      .not('tags', 'is', null)
      .limit(50);

    const workspaceTags = [...new Set(
      (tagSamples ?? []).flatMap((r: any) => r.tags ?? []).filter(Boolean)
    )].slice(0, 30) as string[];

    // 3. Check pending
    const { data: pendingSuggestions } = await supabase
      .from('ai_field_suggestions')
      .select('tag_value')
      .eq('entity_id', entity_id)
      .eq('suggestion_type', 'tag')
      .eq('status', 'pending');

    const pendingTags = (pendingSuggestions ?? []).map((s: any) => s.tag_value).filter(Boolean);

    // 4. Sanitise entity
    const sanitised = Object.fromEntries(
      Object.entries(entity).filter(([k, v]) =>
        v !== null && !['id', 'workspace_id', 'created_at', 'updated_at', 'created_by', 'embedding'].includes(k)
      )
    );

    // 5. Call AI
    const tools = [{
      type: "function",
      function: {
        name: "suggest_tags",
        description: "Suggest relevant tags for a CRM entity",
        parameters: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tag: { type: "string", description: "Tag name (1-3 words, Portuguese)" },
                  confidence: { type: "number", description: "0.0 to 1.0" },
                  reasoning: { type: "string", description: "Brief explanation" },
                },
                required: ["tag", "confidence", "reasoning"],
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `És um especialista em CRM. Sugere 2-5 tags relevantes para entidades de negócio.
Regras:
- Tags concisas (1-3 palavras em português)
- Não repitas tags existentes ou pendentes
- Prefere tags do vocabulário do workspace se relevantes
- Confiança >= 0.7`,
          },
          {
            role: "user",
            content: `Tipo: ${entity_type}
Dados: ${JSON.stringify(sanitised, null, 2)}
Tags existentes: ${JSON.stringify(existingTags)}
Tags pendentes: ${JSON.stringify(pendingTags)}
Tags do workspace: ${JSON.stringify(workspaceTags)}`,
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "suggest_tags" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${resp.status}`);
    }

    const data = await resp.json();
    // Log AI usage (fire-and-forget)
    try {
      logAIUsage({
        workspace_id: workspace_id,
        feature: "ai-entity-tags",
        model: "google/gemini-3-flash-preview",
        tokens_input: data?.usage?.prompt_tokens ?? 0,
        tokens_output: data?.usage?.completion_tokens ?? 0,
      });
    } catch (_e) { /* logging never blocks */ }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ success: true, created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const suggestions = (result.suggestions || []) as Array<{ tag: string; confidence: number; reasoning: string }>;

    // 6. Filter and insert
    const { data: settings } = await supabase
      .from('ai_suggestion_settings')
      .select('min_confidence, max_pending_per_entity')
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    const minConf = settings?.min_confidence ?? 0.7;
    const valid = suggestions.filter(
      s => s.confidence >= minConf && !existingTags.includes(s.tag) && !pendingTags.includes(s.tag)
    );

    if (valid.length === 0) {
      return new Response(JSON.stringify({ success: true, created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = valid.slice(0, 5).map(s => ({
      workspace_id,
      suggestion_type: 'tag',
      entity_type,
      entity_id,
      tag_value: s.tag,
      confidence: s.confidence,
      reasoning: s.reasoning,
      explanation: s.reasoning,
      field_name: 'tags',
      field_type: 'standard',
      suggested_value: s.tag,
      source_context: { entity_type, method: 'ai-entity-tags' },
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('ai_field_suggestions')
      .insert(rows)
      .select();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ success: true, created: inserted?.length ?? 0, suggestions: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-entity-tags:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
