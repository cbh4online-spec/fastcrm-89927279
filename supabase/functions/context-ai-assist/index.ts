import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, blockId, workspaceId, blockType, fields, richText } = await req.json();

    // AI Gate check
    const _gateWsId = typeof workspaceId !== 'undefined' ? workspaceId : (typeof workspace_id !== 'undefined' ? workspace_id : null);
    if (_gateWsId) {
      const gate = await aiGate(_gateWsId, 'heavy', 'context-ai-assist');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


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

      const _startTime = Date.now();
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

      const aiData = await aiResponse.json()

    // AI Usage Instrumentation
    try {
      const _usage = aiData?.usage;
      logAIUsage({
        workspace_id: workspace_id,
        feature: 'context-ai-assist',
        model: aiData?.model || 'google/gemini-3-flash-preview',
        tokens_input: _usage?.prompt_tokens ?? 0,
        tokens_output: _usage?.completion_tokens ?? 0,
        request_type: 'completion',
        latency_ms: Date.now() - (_startTime ?? Date.now()),
      });
    } catch (_e) { /* instrumentation error - non-blocking */ };
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      const actions = toolCall ? JSON.parse(toolCall.function.arguments).actions : [];

      return new Response(JSON.stringify({ actions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "suggest_alerts") {
      // Get existing metrics for this workspace
      const { data: existingMetrics } = await supabase
        .from("pipeline_metrics")
        .select("id, name, metric_type, unit, source_table")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      if (!existingMetrics || existingMetrics.length === 0) {
        return new Response(JSON.stringify({ suggestions: [], error: "Crie métricas primeiro para receber sugestões de alertas." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get existing targets
      const { data: existingTargets } = await supabase
        .from("pipeline_metric_targets")
        .select("metric_id, period, target_value")
        .eq("workspace_id", workspaceId);

      // Get strategic context
      const { data: allBlocks } = await supabase
        .from("context_blocks")
        .select("block_type, title, rich_text")
        .eq("workspace_id", workspaceId);

      const contextSummary = (allBlocks || []).map((b: any) =>
        `[${b.block_type}] ${b.title}${b.rich_text ? `: ${b.rich_text}` : ""}`
      ).join("\n");

      const metricsInfo = existingMetrics.map((m: any) => {
        const tgts = (existingTargets || []).filter((t: any) => t.metric_id === m.id);
        const tgtStr = tgts.length > 0 ? ` (meta: ${tgts.map((t: any) => `${t.target_value} ${t.period}`).join(", ")})` : "";
        return `- ${m.name} [${m.metric_type}] unit:${m.unit} id:${m.id}${tgtStr}`;
      }).join("\n");

      // Get existing alerts to avoid duplicates
      const { data: existingAlerts } = await supabase
        .from("pipeline_metric_alerts")
        .select("metric_id, condition, is_active")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      const existingAlertStr = (existingAlerts || []).map((a: any) =>
        `metric_id:${a.metric_id} condition:${a.condition}`
      ).join(", ");

      const _startTime = Date.now();
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
              content: `És um consultor de vendas e performance. Com base no contexto estratégico e nas métricas existentes, sugere alertas relevantes para monitorizar KPIs críticos. Responde em Português de Portugal. Sê prático e específico.`,
            },
            {
              role: "user",
              content: `CONTEXTO ESTRATÉGICO:\n${contextSummary || "Sem contexto — sugere alertas genéricos."}\n\nMÉTRICAS DISPONÍVEIS:\n${metricsInfo}\n\nALERTAS JÁ EXISTENTES (evitar duplicados):\n${existingAlertStr || "Nenhum"}\n\nSugere 3-5 alertas novos. Cada alerta deve referenciar uma métrica existente pelo id. Condições disponíveis: below_target, above_target, sla_breach, trend_down. Canais: in_app, email, webhook.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_alerts",
                description: "Return alert suggestions based on metrics and context",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          metric_id: { type: "string", description: "ID of an existing metric" },
                          metric_name: { type: "string", description: "Name of the metric for display" },
                          condition: { type: "string", enum: ["below_target", "above_target", "sla_breach", "trend_down"] },
                          threshold_pct: { type: "number", description: "Threshold percentage (e.g. 80 means alert at 80%)" },
                          channel: { type: "string", enum: ["in_app", "email", "webhook"] },
                          reasoning: { type: "string", description: "Why this alert is important" },
                        },
                        required: ["metric_id", "metric_name", "condition", "threshold_pct", "channel", "reasoning"],
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_alerts" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit — tente novamente em breve" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos IA esgotados" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      const suggestions = toolCall ? JSON.parse(toolCall.function.arguments).suggestions : [];

      // Validate metric_ids exist
      const validMetricIds = new Set(existingMetrics.map((m: any) => m.id));
      const validSuggestions = suggestions.filter((s: any) => validMetricIds.has(s.metric_id));

      return new Response(JSON.stringify({ suggestions: validSuggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "suggest_metrics_and_targets") {
      const { data: allBlocks } = await supabase
        .from("context_blocks")
        .select("*, context_fields(*)")
        .eq("workspace_id", workspaceId);

      const contextSummary = (allBlocks || []).map((b: any) => {
        const filledFields = (b.context_fields || [])
          .filter((f: any) => f.field_value !== null && f.field_value !== "")
          .map((f: any) => `  ${f.field_key}: ${JSON.stringify(f.field_value)}`);
        return `[${b.block_type}] ${b.title}\n${filledFields.join("\n")}${b.rich_text ? `\n  Resumo: ${b.rich_text}` : ""}`;
      }).join("\n\n");

      // Also get existing metrics to avoid duplicates
      const { data: existingMetrics } = await supabase
        .from("pipeline_metrics")
        .select("name, metric_type")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      const existingNames = (existingMetrics || []).map((m: any) => m.name).join(", ");

      const _startTime = Date.now();
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
              content: `És um consultor de vendas e performance. Com base no contexto estratégico do negócio, sugere métricas de pipeline e metas relevantes. Responde em Português de Portugal. Sê prático e específico. As fontes de dados disponíveis são: leads, opportunities, contacts, companies, tasks, messages, kernel_events, activity_logs.`,
            },
            {
              role: "user",
              content: `CONTEXTO ESTRATÉGICO:\n${contextSummary || "Sem contexto definido — sugere métricas genéricas de CRM."}\n\nMÉTRICAS JÁ EXISTENTES (evitar duplicados):\n${existingNames || "Nenhuma"}\n\nSugere 4-6 métricas novas com metas, baseadas no contexto do negócio.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_metrics",
                description: "Return metric and target suggestions",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          metric_type: { type: "string", enum: ["volume", "value", "conversion", "time", "quality", "custom"] },
                          formula: { type: "string", enum: ["count", "sum", "avg", "percentage", "duration", "event_count"] },
                          source_table: { type: "string", enum: ["leads", "opportunities", "contacts", "companies", "tasks", "messages", "kernel_events", "activity_logs"] },
                          source_field: { type: "string", description: "Field name for sum/avg formulas, null for count" },
                          unit: { type: "string" },
                          target_value: { type: "number", description: "Suggested monthly target value" },
                          target_period: { type: "string", enum: ["daily", "weekly", "monthly", "quarterly", "annual"] },
                          reasoning: { type: "string", description: "Why this metric matters for this business" },
                        },
                        required: ["name", "description", "metric_type", "formula", "source_table", "unit", "reasoning"],
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_metrics" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit — tente novamente em breve" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos IA esgotados" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
