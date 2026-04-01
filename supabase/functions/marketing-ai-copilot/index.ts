import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, campaignName, emailContent, briefDescription, campaignId, campaignData } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // For actions needing historical data, fetch from DB
    let historicalContext = "";
    if (["optimize_campaign", "analyze_risk", "recommend_segment", "optimize_send_time"].includes(action)) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        
        // Get top performing campaigns
        const { data: topCampaigns } = await supabase
          .from("marketing_campaigns")
          .select("name, subject, sent_count, delivered_count, opened_count, clicked_count, send_hour, template_id")
          .eq("status", "sent")
          .order("opened_count", { ascending: false })
          .limit(10);

        if (topCampaigns && topCampaigns.length > 0) {
          historicalContext = `\n\nDados históricos das melhores campanhas:\n${topCampaigns.map(c => {
            const d = c.delivered_count || 1;
            return `- "${c.subject}" → ${((c.opened_count / d) * 100).toFixed(1)}% abertura, ${((c.clicked_count / d) * 100).toFixed(1)}% cliques, enviada às ${c.send_hour}h`;
          }).join("\n")}`;
        }
      }
    }

    let systemPrompt = "";
    let userPrompt = "";
    let tools: any[] | undefined;
    let toolChoice: any | undefined;

    if (action === "generate_subjects") {
      systemPrompt = `És um especialista em email marketing. Gera variantes de assunto de email que maximizam a taxa de abertura. Responde sempre em português de Portugal.`;
      userPrompt = `Campanha: "${campaignName}"\nConteúdo do email (resumo): ${emailContent?.substring(0, 800) || "não disponível"}\n\nGera 3 variantes de assunto de email.`;
      tools = [{
        type: "function",
        function: {
          name: "return_subjects",
          description: "Return 3 subject line variants",
          parameters: {
            type: "object",
            properties: {
              variants: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    subject: { type: "string" },
                    score: { type: "number" },
                    reason: { type: "string" }
                  },
                  required: ["subject", "score", "reason"],
                  additionalProperties: false
                }
              }
            },
            required: ["variants"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_subjects" } };

    } else if (action === "generate_body") {
      systemPrompt = `És um copywriter profissional de email marketing. Gera emails em HTML inline-styled, prontos para envio. Usa um design limpo e profissional. Responde sempre em português de Portugal. O HTML deve usar inline styles (não classes CSS). Inclui um CTA button claro.`;
      userPrompt = `Descrição breve do que comunicar: "${briefDescription}"\nCampanha: "${campaignName}"\n\nGera o corpo do email em HTML com inline styles.`;
      tools = [{
        type: "function",
        function: {
          name: "return_email_body",
          description: "Return the email body HTML",
          parameters: {
            type: "object",
            properties: {
              html: { type: "string" },
              summary: { type: "string" }
            },
            required: ["html", "summary"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_email_body" } };

    } else if (action === "optimize_campaign") {
      systemPrompt = `És um consultor de email marketing com acesso a dados reais. Analisa a campanha e sugere melhorias concretas baseadas no histórico. Responde em português de Portugal.${historicalContext}`;
      userPrompt = `Campanha actual: ${JSON.stringify(campaignData || {})}\n\nAnalisa e sugere melhorias para subject, preview text, CTA e horário de envio. Baseia-te nos dados históricos fornecidos.`;
      tools = [{
        type: "function",
        function: {
          name: "return_optimization",
          description: "Return optimization suggestions",
          parameters: {
            type: "object",
            properties: {
              suggestion: { type: "string", description: "Resumo da sugestão principal" },
              subject_suggestions: { type: "array", items: { type: "object", properties: { subject: { type: "string" }, score: { type: "number" }, reason: { type: "string" } }, required: ["subject", "score", "reason"], additionalProperties: false } },
              send_time_suggestion: { type: "string" },
              cta_suggestion: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["suggestion", "reasoning"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_optimization" } };

    } else if (action === "analyze_risk") {
      systemPrompt = `És um especialista em deliverability de email. Analisa o conteúdo HTML do email e avalia o risco de ser marcado como spam. Responde em português de Portugal.`;
      const htmlContent = campaignData?.bodyHtml || emailContent || "";
      userPrompt = `Analisa este email HTML para risco de spam:\n\n${htmlContent.substring(0, 2000)}\n\nAvalia: rácio texto/links, rácio texto/imagens, keywords de spam, formatação.`;
      tools = [{
        type: "function",
        function: {
          name: "return_risk_analysis",
          description: "Return spam risk analysis",
          parameters: {
            type: "object",
            properties: {
              risk_level: { type: "string", enum: ["low", "medium", "high"] },
              risk_score: { type: "number", description: "0-100, higher = more risky" },
              issues: { type: "array", items: { type: "string" } },
              suggestion: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["risk_level", "risk_score", "issues", "suggestion", "reasoning"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_risk_analysis" } };

    } else if (action === "recommend_segment") {
      systemPrompt = `És um especialista em segmentação de email marketing com acesso a dados reais. Recomenda o melhor segmento para a campanha. Responde em português de Portugal.${historicalContext}`;
      userPrompt = `Campanha: ${JSON.stringify(campaignData || {})}\n\nCom base nos dados históricos, qual o melhor tipo de segmento para maximizar engagement?`;
      tools = [{
        type: "function",
        function: {
          name: "return_segment_recommendation",
          description: "Return segment recommendation",
          parameters: {
            type: "object",
            properties: {
              suggestion: { type: "string" },
              segment_type: { type: "string" },
              expected_improvement: { type: "string" },
              reasoning: { type: "string" }
            },
            required: ["suggestion", "segment_type", "reasoning"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_segment_recommendation" } };

    } else if (action === "optimize_send_time") {
      systemPrompt = `És um especialista em timing de email marketing com acesso a dados reais de engagement. Recomenda o melhor horário de envio. Responde em português de Portugal.${historicalContext}`;
      userPrompt = `Com base nos dados históricos de engagement, qual o melhor dia e hora para enviar esta campanha?`;
      tools = [{
        type: "function",
        function: {
          name: "return_send_time",
          description: "Return send time recommendation",
          parameters: {
            type: "object",
            properties: {
              suggestion: { type: "string" },
              best_day: { type: "string" },
              best_hour: { type: "number" },
              reasoning: { type: "string" }
            },
            required: ["suggestion", "best_day", "best_hour", "reasoning"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_send_time" } };

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const aiBody: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (tools) aiBody.tools = tools;
    if (toolChoice) aiBody.tool_choice = toolChoice;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("marketing-ai-copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
