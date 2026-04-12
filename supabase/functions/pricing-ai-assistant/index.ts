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
    let model = "google/gemini-3-flash-preview";

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

      // ─── NEW ACTIONS ───

      case "market_research":
        model = "google/gemini-2.5-pro";
        systemPrompt = `Sou um analista sénior de mercado especializado em CRM SaaS europeu. Faço pesquisa detalhada de concorrentes com dados reais de pricing, features e posicionamento. Respondo sempre em português de Portugal.`;
        userPrompt = `Faz uma pesquisa de mercado detalhada dos principais concorrentes de CRM SaaS no mercado europeu/global relevante para PMEs.

Concorrentes a analisar obrigatoriamente: HubSpot, Pipedrive, Monday CRM, Zoho CRM, Salesforce Essentials, Freshsales, Brevo (ex-Sendinblue), Bitrix24.

Para cada concorrente, analisa:
1. Planos disponíveis (tiers) com preços mensais e anuais em EUR
2. Features principais de cada plano
3. Posicionamento de mercado (target, diferenciação)
4. Pontos fortes e fracos

Contexto dos nossos planos atuais:
${JSON.stringify(context, null, 2)}

Identifica também:
- Gaps de pricing onde podemos posicionar-nos
- Features que são standard no mercado e que devemos ter
- Oportunidades de diferenciação

Responde com dados o mais reais e atualizados possível.`;
        break;

      case "suggest_features_by_tier":
        systemPrompt = `Sou um product manager sénior de SaaS CRM. Desenho features progressivas por tier que maximizam conversão entre planos. Cada tier deve ter uma proposta de valor clara e diferenciada. Respondo sempre em português de Portugal.`;
        userPrompt = `Analisa os planos atuais e propõe features diferenciadas para cada nível:

Planos atuais:
${JSON.stringify(context, null, 2)}

Regras:
1. Cada plano deve ter 8-12 features claras e concisas
2. Progressão lógica — o plano superior inclui TUDO do inferior + extras
3. Diferenciadores claros entre tiers (o que justifica pagar mais)
4. Features devem ser realistas para um CRM B2B/B2C moderno
5. Inclui features de IA, automação, integrações, relatórios, suporte
6. O plano START deve ser atrativo para freelancers/micro-empresas
7. O plano GROW para PMEs em crescimento
8. O plano PRO para empresas estabelecidas com equipas

Para cada plano retorna:
- Lista de features (incluindo as herdadas do tier anterior)
- 3-5 diferenciadores exclusivos (o que só este plano tem)
- Análise cruzada de como os tiers se complementam`;
        break;

      case "suggest_modules":
        systemPrompt = `Sou um especialista em marketplace de módulos para CRM SaaS. Proponho módulos add-on que geram receita recorrente e aumentam o valor da plataforma. Respondo sempre em português de Portugal.`;
        userPrompt = `Com base nos planos e módulos existentes, propõe novos módulos para o marketplace:

Contexto atual:
${JSON.stringify(context, null, 2)}

Regras:
1. Propõe 6-10 módulos novos
2. Para cada módulo: nome, categoria, descrição curta, preço sugerido (€/mês), plano mínimo requerido, e justificação de mercado
3. Categorias possíveis: CRM, Marketing, Vendas, Operações, Analytics, IA, Integrações, Comunicação, E-commerce, RH
4. Preços devem ser competitivos (€5-€49/mês)
5. Cada módulo deve resolver um problema real e específico
6. Inclui pelo menos 2 módulos de IA avançada
7. Considera módulos que complementem os planos base sem os canibalizar`;
        break;

      case "suggest_bundles":
        systemPrompt = `Sou um especialista em bundling e promoções de SaaS. Crio bundles temáticos e promoções que aumentam ARPU e reduzem churn. Respondo sempre em português de Portugal.`;
        userPrompt = `Com base nos planos, módulos e contexto atual, propõe bundles e promoções:

Contexto:
${JSON.stringify(context, null, 2)}

Propõe:
1. 3-5 bundles temáticos (ex: "Pack Marketing Digital", "Pack Vendas Pro")
2. Para cada bundle: nome, descrição, módulos incluídos, preço bundle vs preço individual, desconto %, segmento alvo
3. 2-3 promoções temporárias (ex: "Black Friday", "Lançamento Q2")
4. Para cada promoção: nome, desconto %, duração em dias, segmento alvo, messaging de urgência
5. Bundles devem oferecer 15-30% de desconto vs compra individual
6. Promoções devem ser realistas e com gatilhos de urgência`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Build tool calling schema based on action
    const toolSchema = getToolSchema(action);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "pricing_result",
            description: "Return the pricing analysis result",
            parameters: toolSchema,
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
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content);
      } catch {
        result = { raw: content };
      }
    }

    return new Response(JSON.stringify({ result, action }), {
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

function getToolSchema(action: string) {
  switch (action) {
    case "market_research":
      return {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              competitors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    plans: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          tier: { type: "string" },
                          price_monthly: { type: "number" },
                          price_yearly: { type: "number" },
                          features: { type: "array", items: { type: "string" } },
                        },
                        required: ["tier", "price_monthly"],
                      },
                    },
                    positioning: { type: "string" },
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                  },
                  required: ["name", "plans", "positioning"],
                },
              },
              market_summary: { type: "string" },
              pricing_gaps: { type: "array", items: { type: "string" } },
              must_have_features: { type: "array", items: { type: "string" } },
              differentiation_opportunities: { type: "array", items: { type: "string" } },
            },
            required: ["competitors", "market_summary", "pricing_gaps"],
          },
        },
        required: ["result"],
      };

    case "suggest_features_by_tier":
      return {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              tiers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    plan_key: { type: "string" },
                    plan_name: { type: "string" },
                    features: { type: "array", items: { type: "string" } },
                    differentiators: { type: "array", items: { type: "string" } },
                  },
                  required: ["plan_key", "features", "differentiators"],
                },
              },
              cross_tier_analysis: { type: "string" },
            },
            required: ["tiers", "cross_tier_analysis"],
          },
        },
        required: ["result"],
      };

    case "suggest_modules":
      return {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              modules: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    category: { type: "string" },
                    description: { type: "string" },
                    suggested_price: { type: "number" },
                    target_plan: { type: "string" },
                    reasoning: { type: "string" },
                    icon_suggestion: { type: "string" },
                  },
                  required: ["name", "category", "description", "suggested_price", "target_plan", "reasoning"],
                },
              },
            },
            required: ["modules"],
          },
        },
        required: ["result"],
      };

    case "suggest_bundles":
      return {
        type: "object",
        properties: {
          result: {
            type: "object",
            properties: {
              bundles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    modules_included: { type: "array", items: { type: "string" } },
                    price_bundle: { type: "number" },
                    price_individual: { type: "number" },
                    discount_percent: { type: "number" },
                    target_segment: { type: "string" },
                  },
                  required: ["name", "description", "modules_included", "price_bundle", "discount_percent", "target_segment"],
                },
              },
              promotions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    discount_percent: { type: "number" },
                    valid_days: { type: "number" },
                    target_segment: { type: "string" },
                    messaging: { type: "string" },
                  },
                  required: ["name", "discount_percent", "valid_days", "target_segment", "messaging"],
                },
              },
            },
            required: ["bundles", "promotions"],
          },
        },
        required: ["result"],
      };

    default:
      // Generic schema for existing actions
      return {
        type: "object",
        properties: {
          result: { type: "object", description: "The structured result" }
        },
        required: ["result"],
        additionalProperties: false,
      };
  }
}
