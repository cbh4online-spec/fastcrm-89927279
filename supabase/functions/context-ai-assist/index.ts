import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, blockId, workspaceId, blockType, fields, richText } = await req.json();

    if (action === "suggest_fields") {
      // Get all blocks for context
      const { data: allBlocks } = await supabase
        .from("context_blocks")
        .select("block_type, title, rich_text")
        .eq("workspace_id", workspaceId);

      const { data: allFields } = await supabase
        .from("context_fields")
        .select("block_id, field_key, field_value, field_type")
        .in("block_id", (allBlocks || []).map((b: any) => b.id));

      // Build context from existing blocks
      const existingContext = (allBlocks || []).map((b: any) => {
        const bFields = (allFields || []).filter((f: any) => f.block_id === b.id);
        const filledFields = bFields
          .filter((f: any) => f.field_value !== null && f.field_value !== "")
          .map((f: any) => `  ${f.field_key}: ${JSON.stringify(f.field_value)}`);
        return `[${b.block_type}] ${b.title}\n${filledFields.join("\n")}${b.rich_text ? `\n  Resumo: ${b.rich_text}` : ""}`;
      }).join("\n\n");

      // Find empty fields for current block
      const emptyFields = (fields || [])
        .filter((f: any) => f.field_value === null || f.field_value === "" || 
          (Array.isArray(f.field_value) && f.field_value.length === 0))
        .map((f: any) => ({ key: f.field_key, type: f.field_type }));

      if (emptyFields.length === 0) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `És um consultor estratégico de negócios. Com base no contexto existente do negócio, sugere valores realistas e úteis para os campos vazios. Responde sempre em Português de Portugal. Sê prático e específico.`,
            },
            {
              role: "user",
              content: `CONTEXTO DO NEGÓCIO EXISTENTE:\n${existingContext}\n\nBLOCO ATUAL: ${blockType}\n\nCAMPOS VAZIOS A PREENCHER:\n${emptyFields.map((f: any) => `- ${f.key} (tipo: ${f.type})`).join("\n")}\n\nSugere valores para cada campo vazio baseado no contexto do negócio.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_field_values",
                description: "Return suggested values for empty fields",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          field_key: { type: "string" },
                          suggested_value: {},
                          confidence: { type: "number", description: "0-1 confidence score" },
                          reasoning: { type: "string", description: "Brief explanation of the suggestion" },
                        },
                        required: ["field_key", "suggested_value", "confidence", "reasoning"],
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_field_values" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Credits required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      const suggestions = toolCall ? JSON.parse(toolCall.function.arguments).suggestions : [];

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_actions") {
      // Get all blocks context for action generation
      const { data: allBlocks } = await supabase
        .from("context_blocks")
        .select("*, context_fields(*)")
        .eq("workspace_id", workspaceId);

      const contextSummary = (allBlocks || []).map((b: any) => {
        const filledFields = (b.context_fields || [])
          .filter((f: any) => f.field_value !== null && f.field_value !== "")
          .map((f: any) => `  ${f.field_key}: ${JSON.stringify(f.field_value)}`);
        return `[${b.block_type}] ${b.title} (score: ${b.score}%, status: ${b.status})\n${filledFields.join("\n")}`;
      }).join("\n\n");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `És um consultor de gestão. Analisa o contexto estratégico do negócio e gera ações concretas e prioritárias. Responde em Português de Portugal.`,
            },
            {
              role: "user",
              content: `CONTEXTO ESTRATÉGICO COMPLETO:\n${contextSummary}\n\nCom base neste contexto, gera 5-8 ações concretas e prioritárias que a equipa deve executar. Foca-te em gaps, metas não atingidas, processos incompletos e oportunidades.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_actions",
                description: "Generate actionable tasks from business context",
                parameters: {
                  type: "object",
                  properties: {
                    actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          description: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium", "low"] },
                          source_block: { type: "string", description: "Which context block this action relates to" },
                          category: { type: "string", enum: ["gap", "goal", "process", "opportunity"] },
                        },
                        required: ["title", "description", "priority", "source_block", "category"],
                      },
                    },
                  },
                  required: ["actions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_actions" } },
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Credits required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      const actions = toolCall ? JSON.parse(toolCall.function.arguments).actions : [];

      return new Response(JSON.stringify({ actions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("context-ai-assist error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
