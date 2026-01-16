import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeetingData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  contact_name?: string;
  company_name?: string;
}

interface OpportunityData {
  id: string;
  title: string;
  value: number;
  stage: string;
  days_inactive: number;
  probability: number;
  contact_name?: string;
  company_name?: string;
}

interface PerformanceData {
  weekly_target: number;
  weekly_current: number;
  monthly_target: number;
  monthly_current: number;
  deals_to_close: number;
}

interface RequestBody {
  userName: string;
  role: "comercial" | "gestor" | "suporte" | "admin";
  meetings: MeetingData[];
  opportunities: OpportunityData[];
  performance: PerformanceData;
  pendingFollowups: number;
  overdueFollowups: number;
  unreadConversations: number;
  currentHour: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      userName,
      role,
      meetings,
      opportunities,
      performance,
      pendingFollowups,
      overdueFollowups,
      unreadConversations,
      currentHour,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const greeting = currentHour < 12 
      ? `Bom dia, ${userName}!`
      : currentHour < 19 
        ? `Boa tarde, ${userName}!`
        : `Boa noite, ${userName}!`;

    const rolePrompts = {
      comercial: `És um coach de vendas inteligente. O teu objetivo é ajudar o comercial a:
- Fechar mais negócios
- Não perder follow-ups críticos
- Preparar reuniões com sucesso
- Bater metas diárias/semanais/mensais

Prioriza ações que:
1. Tenham maior impacto no fecho de negócios
2. Sejam urgentes (reuniões próximas, deals em risco)
3. Estejam em atraso (follow-ups esquecidos)`,

      gestor: `És um analista de equipa inteligente. O teu objetivo é ajudar o gestor a:
- Ter visão agregada do pipeline
- Identificar gargalos e riscos
- Antecipar problemas de performance
- Tomar decisões baseadas em dados`,

      suporte: `És um assistente de suporte inteligente. O teu objetivo é ajudar a:
- Responder rapidamente a clientes
- Priorizar tickets por urgência
- Manter SLAs
- Identificar padrões recorrentes`,

      admin: `És um conselheiro estratégico. O teu objetivo é ajudar o admin a:
- Monitorizar receita e margens
- Identificar riscos de churn
- Otimizar operações
- Tomar decisões estratégicas`,
    };

    const systemPrompt = `${rolePrompts[role]}

REGRAS:
- Sê MUITO conciso (máximo 20 palavras por item)
- Foca em ações IMEDIATAS e concretas
- Usa dados específicos (nomes, valores, datas)
- Linguagem direta e humana em Português (Portugal)
- Máximo 5 prioridades, ordenadas por impacto

FORMATO JSON:
{
  "daySummary": "Resumo do dia em 1 frase curta com números específicos",
  "priorities": [
    {
      "id": "string único",
      "type": "follow_up|meeting_prep|message|call|close_deal|task|review|alert",
      "title": "Ação clara e curta",
      "description": "Contexto breve",
      "reason": "Porquê esta ação agora (com dados)",
      "priority": "high|medium|low",
      "entityId": "id da entidade se aplicável",
      "entityType": "lead|contact|opportunity|company|ticket",
      "actionRoute": "/dashboard/..."
    }
  ],
  "coachTip": "Uma dica rápida e útil para o dia",
  "motivationalNote": "Nota motivacional curta se aplicável"
}`;

    const meetingsSummary = meetings.length > 0
      ? `Reuniões hoje (${meetings.length}): ${meetings.slice(0, 3).map(m => 
          `${m.title} às ${new Date(m.start_time).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}${m.contact_name ? ` com ${m.contact_name}` : ""}`
        ).join("; ")}`
      : "Sem reuniões hoje";

    const opportunitiesSummary = opportunities.length > 0
      ? `Oportunidades abertas (${opportunities.length}): ${opportunities.slice(0, 5).map(o => 
          `${o.title} (€${o.value}, ${o.stage}, ${o.days_inactive}d sem atividade, ${o.probability}% prob)`
        ).join("; ")}`
      : "Sem oportunidades ativas";

    const highRiskOpps = opportunities.filter(o => o.days_inactive > 7);
    const hotOpps = opportunities.filter(o => o.probability >= 70);

    const userPrompt = `DADOS DO COMERCIAL "${userName}":

${meetingsSummary}

${opportunitiesSummary}

Oportunidades em RISCO (>7 dias sem atividade): ${highRiskOpps.length}
${highRiskOpps.slice(0, 3).map(o => `- ${o.title}: €${o.value}, parado há ${o.days_inactive} dias`).join("\n")}

Oportunidades QUENTES (>70% probabilidade): ${hotOpps.length}
${hotOpps.slice(0, 3).map(o => `- ${o.title}: €${o.value}, ${o.probability}% de fecho`).join("\n")}

Follow-ups pendentes: ${pendingFollowups}
Follow-ups em atraso: ${overdueFollowups}
Conversas não lidas: ${unreadConversations}

METAS:
- Semanal: €${performance.weekly_current} / €${performance.weekly_target} (${Math.round((performance.weekly_current / performance.weekly_target) * 100)}%)
- Mensal: €${performance.monthly_current} / €${performance.monthly_target} (${Math.round((performance.monthly_current / performance.monthly_target) * 100)}%)
- Negócios a fechar para meta: ${performance.deals_to_close}

Hora atual: ${currentHour}h

Gera as prioridades para AGORA.`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback response
      parsed = {
        daySummary: meetings.length > 0 
          ? `Tens ${meetings.length} reunião${meetings.length > 1 ? "ões" : ""} hoje e ${overdueFollowups} follow-ups em atraso.`
          : `Tens ${overdueFollowups} follow-ups em atraso e ${opportunities.length} oportunidades abertas.`,
        priorities: [],
        coachTip: "Começa pelo follow-up mais antigo para limpar a tua lista.",
        motivationalNote: null,
      };
    }

    return new Response(JSON.stringify({
      greeting,
      ...parsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Member priorities error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
