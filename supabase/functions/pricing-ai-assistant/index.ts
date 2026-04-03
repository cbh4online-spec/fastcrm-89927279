import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { action, context, workspace_id } = await req.json();

    // AI Gate — enforce credit consumption
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'medium', 'pricing-ai-assistant');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "suggest_prices":
        systemPrompt = `Sou um especialista em pricing de SaaS CRM. Analiso o contexto do produto e sugiro preços competitivos em EUR. Respondo sempre em JSON válido com a estrutura: {"suggestions": [{"config_key": string, "price_monthly": number, "price_yearly": number, "reasoning": string}]}`;
        userPrompt = `Analisa estes planos/módulos e sugere preços competitivos para o mercado europeu de CRM SaaS:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera: competidores como HubSpot, Pipedrive, Monday CRM. Sugere preços que sejam competitivos mas sustentáveis.`;
        break;

      case "generate_features":
        systemPrompt = `Sou um especialista em produto SaaS CRM. Gero listas de features relevantes e diferenciadores. Respondo sempre em JSON válido com a estrutura: {"features": string[], "highlights": string[]}`;
        userPrompt = `Gera uma lista de features para este plano/módulo:\n\n${JSON.stringify(context, null, 2)}\n\nGera 6-10 features claras e concisas em português. Inclui 3-5 highlights (pontos fortes principais).`;
        break;

      case "create_promotion":
        systemPrompt = `Sou um especialista em marketing de SaaS. Crio promoções eficazes. Respondo sempre em JSON válido com a estrutura: {"name": string, "description": string, "discount_percent": number, "valid_days": number, "target_segment": string, "messaging": string}`;
        userPrompt = `Cria uma promoção para este contexto:\n\n${JSON.stringify(context, null, 2)}\n\nObjetivo: aumentar conversões. Sugere uma promoção realista e atrativa.`;
        break;

      case "optimize_pricing":
        systemPrompt = `Sou um analista de pricing SaaS. Analiso a estrutura de preços actual e recomendo optimizações. Respondo em JSON: {"analysis": string, "recommendations": [{"item": string, "current_price": number, "suggested_price": number, "reasoning": string}]}`;
        userPrompt = `Analisa esta estrutura de preços e recomenda optimizações:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera margens, competitividade e elasticidade de preço.`;
        break;

      case "suggest_plan_limits":
        systemPrompt = `Sou um especialista em pricing e packaging de SaaS CRM B2B. Analiso planos existentes e sugiro limites competitivos baseados em benchmarks do mercado (HubSpot, Pipedrive, Monday CRM, Zoho CRM). Respondo em JSON com a estrutura: {"plans": [{"plan_id": string, "suggestions": {"leads_limit": number, "contacts_limit": number, "companies_limit": number, "opportunities_limit": number, "templates_limit": number, "automations_limit": number, "automation_executions_limit": number, "emails_limit": number, "whatsapp_limit": number, "instagram_limit": number, "ai_calls_limit": number, "storage_limit_mb": number, "users_limit": number}, "reasoning": string}]}. Usa -1 para ilimitado.`;
        userPrompt = `Analisa estes 4 planos de CRM SaaS e sugere limites competitivos para cada um:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera:\n- Progressão lógica Free → Basic → Pro → Agency\n- Benchmarks de mercado (HubSpot Free/Starter/Pro/Enterprise, Pipedrive, Monday)\n- O plano Free deve ser atrativo mas limitante\n- O plano Agency deve ser generoso/ilimitado\n- Mantém coerência entre limites (ex: mais leads = mais emails)`;
        break;

      case "optimize_plan_balance":
        systemPrompt = `Sou um consultor de produto SaaS especializado em otimização de planos. Analiso um plano individual e sugiro ajustes de limites e funcionalidades para equilibrar valor percebido vs custo operacional. Respondo em JSON: {"suggestions": {"leads_limit": number, "contacts_limit": number, "companies_limit": number, "opportunities_limit": number, "templates_limit": number, "automations_limit": number, "automation_executions_limit": number, "emails_limit": number, "whatsapp_limit": number, "instagram_limit": number, "ai_calls_limit": number, "storage_limit_mb": number, "users_limit": number, "inbox_enabled": boolean, "automations_enabled": boolean, "form_studio_enabled": boolean, "templates_enabled": boolean, "proposals_enabled": boolean, "ai_suggestions_enabled": boolean, "landing_pages_enabled": boolean, "integrations_enabled": boolean}, "reasoning": string, "changes": [{"field": string, "from": any, "to": any, "justification": string}]}. Usa -1 para ilimitado.`;
        userPrompt = `Analisa este plano de CRM SaaS e sugere otimizações:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera:\n- Equilibrar valor percebido pelo cliente vs custo operacional\n- Benchmarks de mercado\n- Funcionalidades que devem estar ativas neste tier\n- Limites que podem estar demasiado altos ou baixos`;
        break;

      case "suggest_subscription_plan":
        systemPrompt = `Sou um especialista em planos de manutenção e subscrição B2B. Analiso o catálogo de produtos disponíveis e sugiro um plano de manutenção completo, otimizado para recorrência e retenção. Respondo sempre em JSON válido com a estrutura: {"name": string, "cadence": "monthly"|"bi-monthly"|"quarterly", "products": [{"product_id": string, "name": string, "qty": number, "reasoning": string}], "reasoning": string}`;
        userPrompt = `Com base neste catálogo de produtos disponíveis, sugere um plano de manutenção recorrente ideal:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera:\n- Produtos complementares que façam sentido juntos\n- Quantidades típicas para uso recorrente\n- Cadência que maximize retenção e valor para o cliente\n- Nome descritivo e profissional para o plano`;
        break;

      case "optimize_subscription_plan":
        systemPrompt = `Sou um consultor de optimização de planos de manutenção B2B. Analiso planos existentes e sugiro melhorias para maximizar valor e retenção. Respondo sempre em JSON válido com a estrutura: {"suggestions": [{"type": "add_product"|"remove_product"|"change_qty"|"change_cadence", "description": string, "product_name": string | null, "suggested_qty": number | null, "suggested_cadence": string | null, "reasoning": string}], "overall_analysis": string, "estimated_savings_percent": number | null}`;
        userPrompt = `Analisa este plano de manutenção e sugere optimizações:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera:\n- Se as quantidades estão adequadas ao ciclo\n- Se a cadência é a mais eficiente\n- Produtos complementares que podem estar em falta\n- Oportunidades de poupança ou melhoria de valor`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "pricing_result",
            description: "Return the pricing analysis result",
            parameters: {
              type: "object",
              properties: {
                result: { type: "object", description: "The structured result" }
              },
              required: ["result"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "pricing_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;

    if (toolCall?.function?.arguments) {
      const parsed = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      result = parsed.result || parsed;
    } else {
      // Fallback: try to parse content
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content);
      } catch {
        result = { raw: content };
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pricing-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
