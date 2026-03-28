import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, campaignName, emailContent, briefDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
                    subject: { type: "string", description: "O assunto do email" },
                    score: { type: "number", description: "Score de qualidade 0-100" },
                    reason: { type: "string", description: "Porquê este assunto funciona, em 1 frase" }
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
              html: { type: "string", description: "Email body HTML with inline styles" },
              summary: { type: "string", description: "Brief summary of what was generated" }
            },
            required: ["html", "summary"],
            additionalProperties: false
          }
        }
      }];
      toolChoice = { type: "function", function: { name: "return_email_body" } };

    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (tools) body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
