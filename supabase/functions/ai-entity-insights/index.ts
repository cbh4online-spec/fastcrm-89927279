import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EntityData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  tags?: string[];
  notes?: string;
  ai_temperature?: string;
  lead_score?: number;
  contact_score?: number;
  company_score?: number;
  industry?: string;
  size?: string;
  website?: string;
  company_context?: {
    about_us?: string;
    services?: string;
    products?: string;
    clients?: string;
    team_info?: string;
    mission_values?: string;
    differentiators?: string;
    certifications?: string;
    target_market?: string;
    year_founded?: string;
  };
  created_at: string;
  updated_at: string;
}

interface ProductData {
  id: string;
  name: string;
  short_description?: string;
  category?: string;
  base_price?: number;
  product_type?: string;
  benefits?: string;
}

interface ConversationData {
  messages: Array<{
    content: string;
    direction: string;
    sent_at: string;
    channel?: string;
  }>;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ActivityData {
  openTasks: number;
  completedTasks: number;
  opportunities: Array<{
    value: number;
    status: string;
    stage?: string;
  }>;
  proposals: Array<{
    status: string;
    value: number;
  }>;
  payments: Array<{
    amount: number;
    status: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      entityId, 
      entityType, 
      workspaceId,
      entityData,
      conversationData,
      activityData,
      proactivityLevel = 'medium'
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context for AI analysis
    const entityContext = buildEntityContext(entityData, entityType);
    const conversationContext = buildConversationContext(conversationData);
    const activityContext = buildActivityContext(activityData);

    const systemPrompt = `Você é um analista de CRM especializado em insights operacionais.
Seu objetivo é gerar insights ACIONÁVEIS, não descritivos.

REGRAS:
1. Cada insight deve ter uma AÇÃO clara que o utilizador pode executar
2. Priorize problemas reais sobre informação genérica
3. Use dados concretos (números, datas) nas razões
4. Nunca repita o mesmo insight
5. Máximo 4 insights por análise

TIPOS DE INSIGHT:
- priority: Ações urgentes que precisam atenção imediata
- risk: Riscos de perda, churn ou atraso
- opportunity: Momentos ideais para avançar
- efficiency: Formas de poupar tempo ou automatizar

NÍVEIS DE CONFIANÇA:
- high: Dados claros suportam a conclusão
- medium: Padrão provável mas não confirmado
- low: Sugestão baseada em heurísticas

TIPOS DE AÇÃO:
- reply_now: Responder imediatamente
- create_task: Criar tarefa de acompanhamento
- convert_opportunity: Criar/converter em oportunidade
- apply_template: Usar template específico
- schedule_followup: Agendar follow-up
- create_automation: Sugerir automação
- convert_contact: Converter lead em contacto
- send_proposal: Enviar proposta
- mark_priority: Marcar como prioritário
- archive: Sugerir arquivar

TEMPERATURA:
- cold: Sem engajamento, improvável converter
- warm: Algum interesse, precisa nurturing
- hot: Alta intenção, pronto para avançar
- critical: Urgente, risco de perda se não agir

SCORE (0-100):
- 0-25: Muito frio
- 26-50: Frio/Morno
- 51-75: Quente
- 76-100: Muito quente/Crítico

Proatividade: ${proactivityLevel}
- low: Só insights críticos
- medium: Insights importantes e oportunidades claras
- high: Todos os insights possíveis`;

    const userPrompt = `Analise esta entidade (${entityType}):

DADOS DA ENTIDADE:
${entityContext}

HISTÓRICO DE CONVERSAS:
${conversationContext}

ATIVIDADES E NEGÓCIOS:
${activityContext}

Gere insights acionáveis baseados nestes dados.`;

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
            name: "generate_insights",
            description: "Gera insights e score para a entidade",
            parameters: {
              type: "object",
              properties: {
                score: {
                  type: "object",
                  properties: {
                    value: { type: "number", minimum: 0, maximum: 100 },
                    temperature: { type: "string", enum: ["cold", "warm", "hot", "critical"] },
                    factors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          impact: { type: "string", enum: ["positive", "negative", "neutral"] },
                          weight: { type: "number" },
                          description: { type: "string" }
                        },
                        required: ["name", "impact", "weight", "description"]
                      }
                    }
                  },
                  required: ["value", "temperature", "factors"]
                },
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", enum: ["priority", "risk", "opportunity", "efficiency"] },
                      title: { type: "string", maxLength: 60 },
                      reason: { type: "string", maxLength: 150 },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      action: {
                        type: "object",
                        properties: {
                          type: { 
                            type: "string", 
                            enum: ["reply_now", "create_task", "convert_opportunity", "apply_template", "schedule_followup", "create_automation", "convert_contact", "send_proposal", "mark_priority", "archive"]
                          },
                          label: { type: "string", maxLength: 30 }
                        },
                        required: ["type", "label"]
                      }
                    },
                    required: ["category", "title", "reason", "confidence", "action"]
                  },
                  maxItems: 4
                },
                summary: { type: "string", maxLength: 200 },
                predictedActions: {
                  type: "array",
                  items: { type: "string" },
                  maxItems: 3
                }
              },
              required: ["score", "insights", "summary", "predictedActions"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_insights" } }
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
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No analysis generated");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    
    // Add IDs and timestamps to insights
    const enrichedInsights = analysis.insights.map((insight: any, index: number) => ({
      ...insight,
      id: `${entityId}-${Date.now()}-${index}`,
      createdAt: new Date().toISOString(),
    }));

    const result = {
      score: {
        ...analysis.score,
        lastUpdated: new Date().toISOString(),
      },
      insights: enrichedInsights,
      summary: analysis.summary,
      predictedActions: analysis.predictedActions,
      analysisTimestamp: new Date().toISOString(),
    };

    // Update entity with new AI data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tableMap: Record<string, string> = {
      lead: "leads",
      contact: "contacts",
      company: "companies",
    };

    const scoreFieldMap: Record<string, string> = {
      lead: "lead_score",
      contact: "contact_score",
      company: "company_score",
    };

    await supabase
      .from(tableMap[entityType])
      .update({
        ai_temperature: analysis.score.temperature,
        [scoreFieldMap[entityType]]: analysis.score.value,
        ai_insight: analysis.summary,
        ai_next_action: enrichedInsights[0]?.title || null,
        ai_next_action_type: enrichedInsights[0]?.action?.type || null,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", entityId)
      .eq("workspace_id", workspaceId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("AI Insights error:", error);
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

function buildEntityContext(entity: EntityData, entityType: string): string {
  if (!entity) return "Sem dados da entidade";
  
  const lines: string[] = [
    `Nome: ${entity.name}`,
    entity.email ? `Email: ${entity.email}` : null,
    entity.phone ? `Telefone: ${entity.phone}` : null,
    entity.status ? `Estado: ${entity.status}` : null,
    entity.source ? `Origem: ${entity.source}` : null,
    entity.industry ? `Indústria: ${entity.industry}` : null,
    entity.size ? `Tamanho: ${entity.size}` : null,
    entity.website ? `Website: ${entity.website}` : null,
    entity.tags?.length ? `Tags: ${entity.tags.join(", ")}` : null,
    entity.notes ? `Notas: ${entity.notes.substring(0, 200)}...` : null,
    entity.ai_temperature ? `Temperatura atual: ${entity.ai_temperature}` : null,
    `Score atual: ${entity.lead_score || entity.contact_score || entity.company_score || 'N/A'}`,
    `Criado: ${new Date(entity.created_at).toLocaleDateString('pt-PT')}`,
    `Atualizado: ${new Date(entity.updated_at).toLocaleDateString('pt-PT')}`,
  ].filter(Boolean) as string[];
  
  // Add company context if available (for companies)
  if (entityType === 'company' && entity.company_context) {
    const ctx = entity.company_context;
    lines.push("");
    lines.push("CONTEXTO EMPRESARIAL (do website):");
    if (ctx.about_us) lines.push(`- Sobre: ${ctx.about_us.substring(0, 300)}...`);
    if (ctx.services) lines.push(`- Serviços: ${ctx.services}`);
    if (ctx.products) lines.push(`- Produtos: ${ctx.products}`);
    if (ctx.clients) lines.push(`- Clientes: ${ctx.clients}`);
    if (ctx.target_market) lines.push(`- Mercado-alvo: ${ctx.target_market}`);
    if (ctx.differentiators) lines.push(`- Diferenciais: ${ctx.differentiators}`);
    if (ctx.mission_values) lines.push(`- Missão: ${ctx.mission_values.substring(0, 150)}...`);
  }
  
  return lines.join("\n");
}

function buildConversationContext(data: ConversationData | null): string {
  if (!data?.messages?.length) return "Sem histórico de conversas";
  
  const recentMessages = data.messages.slice(-15);
  const messageLines = recentMessages.map(m => 
    `[${m.direction === 'inbound' ? 'CLIENTE' : 'EQUIPA'}] ${m.content.substring(0, 100)}`
  );
  
  const context = [
    `Total de mensagens recentes: ${data.messages.length}`,
    data.lastMessageAt ? `Última mensagem: ${new Date(data.lastMessageAt).toLocaleString('pt-PT')}` : null,
    data.unreadCount > 0 ? `Mensagens não lidas: ${data.unreadCount}` : null,
    "",
    "Histórico:",
    ...messageLines,
  ].filter(Boolean);
  
  return context.join("\n");
}

function buildActivityContext(data: ActivityData | null): string {
  if (!data) return "Sem dados de atividade";
  
  const lines: string[] = [
    `Tarefas abertas: ${data.openTasks}`,
    `Tarefas concluídas: ${data.completedTasks}`,
  ];
  
  if (data.opportunities?.length) {
    const totalValue = data.opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
    lines.push(`Oportunidades: ${data.opportunities.length} (€${totalValue.toLocaleString()})`);
    data.opportunities.forEach(o => {
      lines.push(`  - ${o.status}: €${o.value?.toLocaleString() || 0}${o.stage ? ` (${o.stage})` : ''}`);
    });
  }
  
  if (data.proposals?.length) {
    lines.push(`Propostas: ${data.proposals.length}`);
    data.proposals.forEach(p => {
      lines.push(`  - ${p.status}: €${p.value?.toLocaleString() || 0}`);
    });
  }
  
  if (data.payments?.length) {
    const totalPaid = data.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    lines.push(`Pagamentos: ${data.payments.length} (€${totalPaid.toLocaleString()} recebido)`);
  }
  
  return lines.join("\n");
}
