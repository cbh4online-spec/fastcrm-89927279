import { corsHeaders } from "../_shared/cors.ts";

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "generate_vertical_template",
    description: "Gera todo o conteúdo AIDA para uma landing page vertical de CRM.",
    parameters: {
      type: "object",
      properties: {
        dor_principal: { type: "string", description: "Frase de dor principal do público-alvo (máx 120 chars)" },
        resultado_prometido: { type: "string", description: "Resultado prometido (máx 80 chars)" },
        dores: {
          type: "array",
          items: { type: "string" },
          minItems: 4,
          maxItems: 4,
          description: "4 dores específicas do público-alvo (frases curtas)"
        },
        modulos_ativos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              desc: { type: "string" },
              icon: { type: "string", enum: ["Users", "Zap", "MessageSquare", "Brain", "BarChart3", "Clock", "Shield", "DollarSign", "Target", "Mail", "Star", "Package"] }
            },
            required: ["nome", "desc", "icon"],
            additionalProperties: false
          },
          minItems: 6,
          maxItems: 6,
          description: "6 módulos do CRM adaptados a esta vertical"
        },
        antes_depois: {
          type: "object",
          properties: {
            antes: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            depois: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 }
          },
          required: ["antes", "depois"],
          additionalProperties: false,
          description: "4 situações antes vs depois de usar o CRM"
        },
        roi_exemplo: {
          type: "object",
          properties: {
            clientes_extra: { type: "number" },
            valor_medio: { type: "number" },
            periodo: { type: "string" }
          },
          required: ["clientes_extra", "valor_medio", "periodo"],
          additionalProperties: false
        },
        cta_principal: { type: "string", description: "Texto do botão CTA principal (máx 40 chars)" },
        cta_secundario: { type: "string", description: "Texto do botão CTA secundário (máx 40 chars)" },
        ai_persona_nome: { type: "string", description: "Nome da persona AI para esta vertical" },
        seo: {
          type: "object",
          properties: {
            title: { type: "string", description: "SEO title (máx 60 chars)" },
            description: { type: "string", description: "Meta description (máx 160 chars)" }
          },
          required: ["title", "description"],
          additionalProperties: false
        }
      },
      required: ["dor_principal", "resultado_prometido", "dores", "modulos_ativos", "antes_depois", "roi_exemplo", "cta_principal", "cta_secundario", "ai_persona_nome", "seo"],
      additionalProperties: false
    }
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome } = await req.json();
    if (!nome || typeof nome !== "string" || nome.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Nome da vertical é obrigatório (mín. 2 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `És um especialista em copywriting de vendas usando o método AIDA (Atenção, Interesse, Desejo, Acção) para landing pages de CRM.

O produto chama-se FastCRM — um CRM com IA para PMEs portuguesas que automatiza vendas, comunicação omnicanal e gestão de clientes.

Vais receber o nome de uma área de negócio e deves gerar TODO o conteúdo persuasivo para uma landing page vertical usando a tool fornecida.

Regras:
- Escreve SEMPRE em português de Portugal (PT-PT), nunca brasileiro
- A dor_principal deve ser impactante e específica para o sector (máx 120 chars)
- O resultado_prometido deve ser aspiracional e concreto (máx 80 chars)
- As 4 dores devem ser problemas reais e específicos do sector
- Os 6 módulos devem ser funcionalidades CRM adaptadas ao contexto do sector
- Os antes/depois devem mostrar transformação concreta
- O ROI deve ser realista para o sector (clientes_extra, valor_medio em €, periodo)
- CTAs devem ser orientados à acção e urgência
- SEO title máx 60 chars, description máx 160 chars
- Usa ícones que façam sentido para cada módulo`;

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
          { role: "user", content: `Gera o conteúdo AIDA completo para a vertical: "${nome.trim()}"` },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "generate_vertical_template" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adiciona créditos em Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("A IA não retornou o formato esperado");
    }

    const generated = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(generated), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-vertical-template error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
