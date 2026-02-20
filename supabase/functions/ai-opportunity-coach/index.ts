

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpportunityData {
  id: string;
  title: string;
  value: number;
  probability: number;
  status: string;
  expected_close_date?: string;
  stage?: {
    name: string;
    probability: number;
    position: number;
  };
  lead?: {
    name: string;
    email?: string;
    phone?: string;
  };
  contact?: {
    name: string;
    email?: string;
    phone?: string;
    job_title?: string;
  };
  company?: {
    name: string;
    industry?: string;
    size?: string;
  };
  source?: string;
  notes?: string;
  created_at: string;
  last_activity_at?: string;
  ai_temperature?: string;
}

interface EntityContext {
  name: string;
  type: 'lead' | 'contact' | 'company';
  industry?: string;
  notes?: string;
  recentActivity?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunities, entityContext, language = 'pt' } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const opportunitiesContext = buildOpportunitiesContext(opportunities);
    const entityInfo = buildEntityInfo(entityContext);

    const systemPrompt = `Você é um Coach de Vendas especializado em ajudar equipas a fechar negócios B2B.
Seu objetivo é analisar oportunidades e fornecer orientação PRÁTICA e ACIONÁVEL.

CONTEXTO IMPORTANTE:
${entityInfo}

REGRAS:
1. Foque em AÇÕES específicas que aumentam probabilidade de fecho
2. Identifique riscos e oportunidades perdidas
3. Sugira próximos passos concretos com prioridade
4. Use dados das oportunidades para personalizar conselhos
5. Seja direto e objetivo - vendedores não têm tempo para textos longos

ANÁLISE POR OPORTUNIDADE:
Para cada oportunidade, avalie:
- Estado atual vs. potencial
- Tempo no funil (está a estagnar?)
- Sinais de risco ou oportunidade
- Próxima ação de maior impacto

RESPONDA EM ${language === 'pt' ? 'PORTUGUÊS' : 'INGLÊS'}`;

    const userPrompt = `Analise estas oportunidades e forneça coaching de vendas:

${opportunitiesContext}

Para cada oportunidade, quero:
1. Diagnóstico rápido (1 linha)
2. Risco principal (se houver)
3. Próxima ação de alto impacto
4. Previsão de fecho (realista)

No final, dê uma estratégia geral para este cliente/empresa.`;

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
            name: "generate_sales_coaching",
            description: "Gera análise e coaching para oportunidades de venda",
            parameters: {
              type: "object",
              properties: {
                overallScore: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                  description: "Score geral de saúde do pipeline para esta entidade"
                },
                overallHealth: {
                  type: "string",
                  enum: ["excellent", "good", "attention", "critical"],
                  description: "Estado geral do pipeline"
                },
                opportunityAnalysis: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      opportunityId: { type: "string" },
                      diagnosis: { type: "string", maxLength: 100 },
                      riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      riskReason: { type: "string", maxLength: 80 },
                      winProbability: { type: "number", minimum: 0, maximum: 100 },
                      nextAction: {
                        type: "object",
                        properties: {
                          action: { type: "string", maxLength: 80 },
                          priority: { type: "string", enum: ["now", "today", "this_week", "soon"] },
                          impact: { type: "string", enum: ["high", "medium", "low"] }
                        },
                        required: ["action", "priority", "impact"]
                      },
                      closePrediction: {
                        type: "object",
                        properties: {
                          likelihood: { type: "string", enum: ["very_likely", "likely", "uncertain", "unlikely"] },
                          estimatedDays: { type: "number" },
                          blockers: { type: "array", items: { type: "string" }, maxItems: 3 }
                        },
                        required: ["likelihood", "estimatedDays"]
                      },
                      coachingTips: {
                        type: "array",
                        items: { type: "string", maxLength: 100 },
                        maxItems: 3
                      }
                    },
                    required: ["opportunityId", "diagnosis", "riskLevel", "nextAction", "closePrediction"]
                  }
                },
                strategicRecommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", enum: ["urgency", "relationship", "value", "process", "timing"] },
                      title: { type: "string", maxLength: 60 },
                      description: { type: "string", maxLength: 150 },
                      expectedOutcome: { type: "string", maxLength: 80 }
                    },
                    required: ["category", "title", "description"]
                  },
                  maxItems: 4
                },
                quickWins: {
                  type: "array",
                  items: { type: "string", maxLength: 60 },
                  maxItems: 3,
                  description: "Ações simples de alto impacto"
                },
                totalPipelineValue: { type: "number" },
                weightedValue: { type: "number" },
                expectedCloseValue: { type: "number", description: "Valor provável de fecho baseado na análise" }
              },
              required: ["overallScore", "overallHealth", "opportunityAnalysis", "strategicRecommendations", "quickWins"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_sales_coaching" } }
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
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No coaching generated");
    }

    const coaching = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify({
      ...coaching,
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Opportunity Coach error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

function buildOpportunitiesContext(opportunities: OpportunityData[]): string {
  if (!opportunities?.length) return "Sem oportunidades ativas";

  return opportunities.map((opp, index) => {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(opp.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceActivity = opp.last_activity_at 
      ? Math.floor((Date.now() - new Date(opp.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const daysUntilClose = opp.expected_close_date
      ? Math.floor((new Date(opp.expected_close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return `
OPORTUNIDADE ${index + 1} (ID: ${opp.id}):
- Título: ${opp.title}
- Valor: €${opp.value?.toLocaleString() || 0}
- Probabilidade: ${opp.probability}%
- Valor ponderado: €${((opp.value || 0) * (opp.probability || 50) / 100).toLocaleString()}
- Estado: ${opp.status}
- Etapa: ${opp.stage?.name || 'N/A'} (posição ${opp.stage?.position ?? 'N/A'})
- Origem: ${opp.source || 'N/A'}
- Dias no funil: ${daysSinceCreation}
- Última atividade: ${daysSinceActivity !== null ? `há ${daysSinceActivity} dias` : 'sem registo'}
- Data prevista de fecho: ${opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString('pt-PT') : 'não definida'} ${daysUntilClose !== null ? `(${daysUntilClose} dias)` : ''}
- Temperatura IA: ${opp.ai_temperature || 'não avaliada'}
${opp.contact ? `- Contacto: ${opp.contact.name} (${opp.contact.job_title || 'cargo N/A'})` : ''}
${opp.lead ? `- Lead: ${opp.lead.name}` : ''}
${opp.notes ? `- Notas: ${opp.notes.substring(0, 100)}...` : ''}
`.trim();
  }).join("\n\n---\n\n");
}

function buildEntityInfo(context?: EntityContext): string {
  if (!context) return "Contexto da entidade não disponível";
  
  return `
CLIENTE/EMPRESA: ${context.name}
Tipo: ${context.type}
${context.industry ? `Indústria: ${context.industry}` : ''}
${context.notes ? `Notas gerais: ${context.notes.substring(0, 200)}` : ''}
${context.recentActivity ? `Atividade recente: ${context.recentActivity}` : ''}
`.trim();
}
