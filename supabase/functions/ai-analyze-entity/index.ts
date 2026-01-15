import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityId, entityType, workspaceId, messages, conversationChannel, existingOpportunities } = 
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messageContext = messages?.slice(-20).map((m: any) => 
      `[${m.direction === 'inbound' ? 'CONTACTO' : 'VOCÊ'}]: ${m.content}`
    ).join("\n") || "Sem mensagens disponíveis";

    const opportunityContext = existingOpportunities?.length 
      ? `Oportunidades: ${existingOpportunities.map((o: any) => `€${o.value} (${o.status})`).join(", ")}`
      : "Sem oportunidades";

    const entityConfig = entityType === "contact" ? {
      table: "contacts",
      scoreField: "contact_score",
      typeField: "ai_contact_type",
      typeOptions: ["decision_maker", "influencer", "champion", "blocker", "end_user", "unknown"],
      typePrompt: `TIPOS DE CONTACTO:
- decision_maker: Decisor final com poder de compra
- influencer: Influencia a decisão mas não decide
- champion: Defensor interno do produto/serviço
- blocker: Pode bloquear a venda
- end_user: Utilizador final
- unknown: Impossível determinar`
    } : {
      table: "companies",
      scoreField: "company_score",
      typeField: "ai_company_type",
      typeOptions: ["prospect", "client", "partner", "competitor", "vendor", "unknown"],
      typePrompt: `TIPOS DE EMPRESA:
- prospect: Potencial cliente
- client: Cliente ativo
- partner: Parceiro de negócio
- competitor: Concorrente
- vendor: Fornecedor
- unknown: Impossível determinar`
    };

    const systemPrompt = `Você é um analista de CRM especializado em qualificação de ${entityType === "contact" ? "contactos" : "empresas"}.

REGRAS DE TEMPERATURA:
- COLD: Sem interação recente, sem intenção clara
- WARM: Algum interesse, engagement moderado
- HOT: Alta intenção, urgência, negociação ativa

REGRAS DE SCORE (0-100):
- 0-30: Frio, pouco provável
- 31-60: Morno, potencial médio
- 61-80: Quente, alta probabilidade
- 81-100: Muito quente, pronto para fechar

${entityConfig.typePrompt}

PRÓXIMAS AÇÕES:
- reply_manual: Responder pessoalmente
- send_template: Enviar template
- create_opportunity: Criar oportunidade
- activate_automation: Ativar automação
- archive: Arquivar
- follow_up: Agendar follow-up
- schedule_meeting: Agendar reunião

INSIGHT: Uma frase curta e acionável (máx 100 chars)`;

    const userPrompt = `Analise este ${entityType === "contact" ? "contacto" : "empresa"}:

CANAL: ${conversationChannel || 'Desconhecido'}
${opportunityContext}

HISTÓRICO:
${messageContext}

Retorne a análise.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_entity",
            description: "Retorna análise completa",
            parameters: {
              type: "object",
              properties: {
                temperature: { type: "string", enum: ["cold", "warm", "hot"] },
                score: { type: "number", minimum: 0, maximum: 100 },
                entityType: { type: "string", enum: entityConfig.typeOptions },
                nextAction: { type: "string" },
                nextActionType: { type: "string", enum: ["reply_manual", "send_template", "create_opportunity", "activate_automation", "archive", "follow_up", "schedule_meeting"] },
                insight: { type: "string", maxLength: 100 },
                estimatedValue: { type: "number", minimum: 0 },
                conversionProbability: { type: "number", minimum: 0, maximum: 100 },
                autoTags: { type: "array", items: { type: "string" } }
              },
              required: ["temperature", "score", "entityType", "nextAction", "nextActionType", "insight", "estimatedValue", "conversionProbability", "autoTags"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_entity" } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No analysis");

    const analysis = JSON.parse(toolCall.function.arguments);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from(entityConfig.table)
      .update({
        ai_temperature: analysis.temperature,
        [entityConfig.scoreField]: analysis.score,
        [entityConfig.typeField]: analysis.entityType,
        ai_next_action: analysis.nextAction,
        ai_next_action_type: analysis.nextActionType,
        ai_insight: analysis.insight,
        estimated_value: analysis.estimatedValue,
        conversion_probability: analysis.conversionProbability,
        tags: analysis.autoTags,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq("id", entityId)
      .eq("workspace_id", workspaceId);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});