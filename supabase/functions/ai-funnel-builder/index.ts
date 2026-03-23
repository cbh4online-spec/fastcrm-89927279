import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-FUNNEL-BUILDER] ${step}${detailsStr}`);
};

const SYSTEM_PROMPT = `És um arquiteto de funis de vendas e marketing digital de elite. O teu trabalho é analisar o briefing do utilizador e gerar uma recomendação completa de funil.

RESPONDE SEMPRE chamando a tool "recommend_funnel" com a estrutura completa. Nunca respondas em texto livre.

Regras:
- Vertical: escolhe a vertical de negócio adequada (Educação Online, Saúde, SaaS, Serviços, E-commerce, Imobiliário, etc.)
- Template: recomenda o formato ideal (Masterclass, Lead Magnet, Quiz, Landing Page, Webinar, Application, etc.)
- Captura: form, quiz, live, masterclass, whatsapp, checkout, application
- Funil steps: entre 3 a 6 steps, cada um com name, type (page/optin/thankyou/checkout/upsell/downsell) e description
- Routing: pipeline, tags relevantes, SLA em horas
- Automações: 3-5 automações com trigger, action e channel (email/whatsapp/notification)
- Tracking: eventos a rastrear (PageView, Registration, etc.)
- KPIs: métricas a acompanhar
- SEO: title e description optimizados
- Reasoning: explica o raciocínio da recomendação em 2-3 frases

Adapta a complexidade ao objectivo:
- Venda directa de baixo ticket → funil simples (3 steps)
- Venda consultiva de alto ticket → funil com qualificação (5-6 steps)
- Geração de leads → funil com lead magnet ou quiz
- Eventos → funil com inscrição + reminders`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    logStep("User authenticated", { userId: user.id });

    const { messages, mode, wizardAnswers } = await req.json();

    // Build messages for AI
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (mode === "wizard" && wizardAnswers) {
      const briefing = Object.entries(wizardAnswers)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("\n");
      aiMessages.push({
        role: "user",
        content: `Gera um funil completo com base nestas respostas do wizard:\n\n${briefing}`,
      });
    } else if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (msg.role === "user" || msg.role === "assistant") {
          aiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    } else {
      throw new Error("No messages or wizard answers provided");
    }

    logStep("Calling AI Gateway", { messageCount: aiMessages.length, mode });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: [{
          type: "function",
          function: {
            name: "recommend_funnel",
            description: "Generate a complete funnel recommendation based on the user's briefing",
            parameters: {
              type: "object",
              properties: {
                vertical: { type: "string", description: "Business vertical" },
                pageTemplate: { type: "string", description: "Page template name" },
                captureType: { type: "string", enum: ["form", "quiz", "live", "masterclass", "whatsapp", "checkout", "application"] },
                objective: { type: "string", description: "Main objective" },
                headline: { type: "string", description: "Main headline for the landing page" },
                subheadline: { type: "string", description: "Supporting subheadline" },
                ctaPrimary: { type: "string", description: "Primary CTA text" },
                ctaSecondary: { type: "string", description: "Secondary CTA text" },
                funnelSteps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string", enum: ["page", "optin", "thankyou", "checkout", "upsell", "downsell"] },
                      description: { type: "string" },
                    },
                    required: ["name", "type", "description"],
                  },
                },
                routing: {
                  type: "object",
                  properties: {
                    pipeline: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    sla: { type: "string" },
                  },
                  required: ["pipeline", "tags", "sla"],
                },
                automations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      trigger: { type: "string" },
                      action: { type: "string" },
                      channel: { type: "string", enum: ["email", "whatsapp", "notification", "sms"] },
                    },
                    required: ["trigger", "action", "channel"],
                  },
                },
                tracking: { type: "array", items: { type: "string" } },
                kpis: { type: "array", items: { type: "string" } },
                slug: { type: "string", description: "URL-friendly slug" },
                domain: { type: "string", description: "Suggested domain" },
                thankYou: { type: "string", description: "Thank you page behavior" },
                seo: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["title", "description"],
                },
                reasoning: { type: "string", description: "AI reasoning explanation in Portuguese" },
              },
              required: ["vertical", "pageTemplate", "captureType", "objective", "headline", "subheadline", "ctaPrimary", "ctaSecondary", "funnelSteps", "routing", "automations", "tracking", "kpis", "slug", "domain", "thankYou", "seo", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend_funnel" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tenta novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos Lovable AI insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      logStep("AI Gateway error", { status: response.status, body: errorText });
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    logStep("AI response received");

    // Extract tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "recommend_funnel") {
      throw new Error("AI did not return a funnel recommendation");
    }

    const recommendation = JSON.parse(toolCall.function.arguments);
    logStep("Recommendation parsed", { vertical: recommendation.vertical, steps: recommendation.funnelSteps?.length });

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
