import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadAnalysisRequest {
  leadId: string;
  workspaceId: string;
  messages?: Array<{ direction: string; content: string; sent_at: string }>;
  conversationChannel?: string;
  existingOpportunities?: Array<{ value: number; status: string }>;
}

interface LeadAnalysisResult {
  temperature: "cold" | "warm" | "hot";
  leadScore: number;
  leadType: "lead" | "client" | "supplier" | "spam" | "unknown";
  nextAction: string;
  nextActionType: "reply_manual" | "send_template" | "create_opportunity" | "activate_automation" | "archive" | "follow_up";
  insight: string;
  estimatedValue: number;
  conversionProbability: number;
  autoTags: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, workspaceId, messages, conversationChannel, existingOpportunities } = 
      await req.json() as LeadAnalysisRequest;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI analysis
    const messageContext = messages?.slice(-20).map(m => 
      `[${m.direction === 'inbound' ? 'LEAD' : 'VOCÊ'}]: ${m.content}`
    ).join("\n") || "Sem mensagens disponíveis";

    const opportunityContext = existingOpportunities?.length 
      ? `Oportunidades existentes: ${existingOpportunities.map(o => `€${o.value} (${o.status})`).join(", ")}`
      : "Sem oportunidades registadas";

    const systemPrompt = `Você é um analista de CRM especializado em qualificação de leads.
Analise o lead com base nas mensagens e contexto fornecidos.

REGRAS DE TEMPERATURA:
- COLD (Frio ❄️): Sem interação recente, sem intenção clara, mensagens genéricas
- WARM (Morno 🟡): Algum interesse demonstrado, perguntas sobre produto/serviço, engagement moderado
- HOT (Quente 🔥): Alta intenção de compra, urgência, pedidos de orçamento, negociação ativa

REGRAS DE LEAD SCORE (0-100):
- 0-30: Lead frio, pouco provável de converter
- 31-60: Lead morno, potencial médio
- 61-80: Lead quente, alta probabilidade
- 81-100: Lead muito quente, pronto para fechar

TIPOS DE LEAD:
- lead: Potencial cliente interessado
- client: Cliente existente
- supplier: Fornecedor oferecendo serviços
- spam: Mensagem irrelevante ou spam
- unknown: Impossível determinar

PRÓXIMAS AÇÕES (escolha UMA):
- reply_manual: Responder pessoalmente (leads quentes ou complexos)
- send_template: Enviar template adequado (follow-ups padrão)
- create_opportunity: Criar oportunidade no pipeline (interesse confirmado)
- activate_automation: Ativar automação de nurturing
- archive: Arquivar (spam ou irrelevante)
- follow_up: Agendar follow-up

INSIGHT:
- Uma frase curta e acionável (máx 100 caracteres)
- Foco no que o utilizador deve fazer agora
- Tom profissional mas direto`;

    const userPrompt = `Analise este lead:

CANAL: ${conversationChannel || 'Desconhecido'}
${opportunityContext}

HISTÓRICO DE MENSAGENS:
${messageContext}

Retorne a análise usando a função analyze_lead.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_lead",
              description: "Retorna a análise completa do lead",
              parameters: {
                type: "object",
                properties: {
                  temperature: {
                    type: "string",
                    enum: ["cold", "warm", "hot"],
                    description: "Temperatura do lead"
                  },
                  leadScore: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Score do lead (0-100)"
                  },
                  leadType: {
                    type: "string",
                    enum: ["lead", "client", "supplier", "spam", "unknown"],
                    description: "Tipo de lead identificado"
                  },
                  nextAction: {
                    type: "string",
                    description: "Descrição da próxima ação recomendada"
                  },
                  nextActionType: {
                    type: "string",
                    enum: ["reply_manual", "send_template", "create_opportunity", "activate_automation", "archive", "follow_up"],
                    description: "Tipo da próxima ação"
                  },
                  insight: {
                    type: "string",
                    maxLength: 100,
                    description: "Insight curto e acionável"
                  },
                  estimatedValue: {
                    type: "number",
                    minimum: 0,
                    description: "Valor estimado do negócio em euros"
                  },
                  conversionProbability: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Probabilidade de conversão (%)"
                  },
                  autoTags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags automáticas sugeridas"
                  }
                },
                required: ["temperature", "leadScore", "leadType", "nextAction", "nextActionType", "insight", "estimatedValue", "conversionProbability", "autoTags"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_lead" } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No analysis returned from AI");
    }

    const analysis: LeadAnalysisResult = JSON.parse(toolCall.function.arguments);

    // Update the lead in the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        ai_temperature: analysis.temperature,
        lead_score: analysis.leadScore,
        ai_lead_type: analysis.leadType,
        ai_next_action: analysis.nextAction,
        ai_next_action_type: analysis.nextActionType,
        ai_insight: analysis.insight,
        estimated_value: analysis.estimatedValue,
        conversion_probability: analysis.conversionProbability,
        tags: analysis.autoTags,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq("id", leadId)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error("Error updating lead:", updateError);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Lead analysis error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});