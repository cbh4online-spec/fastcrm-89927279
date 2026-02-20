

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CoreKPIs {
  leads: {
    leadsToday: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
    leadToOpportunityRate: number;
    avgResponseTimeHours: number;
    leadsTrend: string;
  };
  opportunities: {
    activeOpportunities: number;
    totalPipelineValue: number;
    weightedValue: number;
    closeRate: number;
    avgCloseTimeDays: number;
    opportunitiesTrend: string;
  };
  efficiency: {
    staleOpportunities: number;
    overdueFollowups: number;
    activeAutomations: number;
    manualVsAutomatedRatio: number;
    timeSavedHours: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { kpiData, industryType } = await req.json() as {
      kpiData: CoreKPIs;
      industryType: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const industryLabels: Record<string, string> = {
      general: "vendas gerais",
      education: "educação/matrículas",
      health: "saúde/consultas",
      services: "serviços/agências",
      real_estate: "imobiliário",
    };

    const systemPrompt = `És um analista de negócios especializado em CRM para ${industryLabels[industryType] || "vendas"}.
Analisa os KPIs fornecidos e gera insights acionáveis em português de Portugal.

Regras:
- Sê direto e conciso
- Prioriza riscos e oportunidades
- Sugere ações específicas
- Usa linguagem simples e profissional
- Máximo 3-4 insights principais
- Cada insight deve ter um título curto e uma descrição de 1-2 frases

Responde APENAS em JSON válido com esta estrutura:
{
  "summary": "Resumo de 1-2 frases do estado geral do negócio",
  "insights": [
    {
      "id": "unique_id",
      "type": "warning|opportunity|info|success",
      "priority": "high|medium|low",
      "title": "Título curto",
      "description": "Explicação do insight",
      "suggestion": "Ação recomendada (opcional)"
    }
  ],
  "recommendations": ["Recomendação 1", "Recomendação 2"],
  "riskAlerts": ["Alerta de risco (se aplicável)"]
}`;

    const userPrompt = `Analisa estes KPIs:

LEADS:
- Hoje: ${kpiData.leads.leadsToday}
- Esta semana: ${kpiData.leads.leadsThisWeek}
- Este mês: ${kpiData.leads.leadsThisMonth}
- Taxa conversão Lead→Oportunidade: ${kpiData.leads.leadToOpportunityRate}%
- Tempo médio de resposta: ${kpiData.leads.avgResponseTimeHours}h
- Tendência: ${kpiData.leads.leadsTrend}

OPORTUNIDADES:
- Ativas: ${kpiData.opportunities.activeOpportunities}
- Valor total pipeline: €${kpiData.opportunities.totalPipelineValue.toLocaleString()}
- Valor ponderado: €${kpiData.opportunities.weightedValue.toLocaleString()}
- Taxa de fecho: ${kpiData.opportunities.closeRate}%
- Tempo médio até fecho: ${kpiData.opportunities.avgCloseTimeDays} dias
- Tendência: ${kpiData.opportunities.opportunitiesTrend}

EFICIÊNCIA:
- Oportunidades paradas: ${kpiData.efficiency.staleOpportunities}
- Follow-ups em atraso: ${kpiData.efficiency.overdueFollowups}
- Automações ativas: ${kpiData.efficiency.activeAutomations}
- Tempo estimado poupado: ${kpiData.efficiency.timeSavedHours}h

Tipo de negócio: ${industryType}`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return fallback analysis
      analysis = generateFallbackAnalysis(kpiData);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI KPI analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackAnalysis(kpiData: CoreKPIs) {
  const insights = [];
  const recommendations = [];
  const riskAlerts = [];

  // Check for stale opportunities
  if (kpiData.efficiency.staleOpportunities > 0) {
    insights.push({
      id: "stale-opps",
      type: "warning",
      priority: kpiData.efficiency.staleOpportunities > 3 ? "high" : "medium",
      title: `${kpiData.efficiency.staleOpportunities} oportunidades paradas`,
      description: "Oportunidades sem atividade há mais de 7 dias podem estar a esfriar.",
      suggestion: "Agenda follow-ups para reativar estas oportunidades.",
    });
    riskAlerts.push(`${kpiData.efficiency.staleOpportunities} oportunidades podem estar perdidas.`);
  }

  // Check for overdue followups
  if (kpiData.efficiency.overdueFollowups > 0) {
    insights.push({
      id: "overdue-followups",
      type: "warning",
      priority: "high",
      title: `${kpiData.efficiency.overdueFollowups} follow-ups em atraso`,
      description: "Ações pendentes podem estar a atrasar o fecho de negócios.",
      suggestion: "Prioriza completar estas tarefas hoje.",
    });
  }

  // Check response time
  if (kpiData.leads.avgResponseTimeHours > 24) {
    insights.push({
      id: "slow-response",
      type: "warning",
      priority: "medium",
      title: "Tempo de resposta lento",
      description: `Média de ${kpiData.leads.avgResponseTimeHours}h para responder. Respostas rápidas melhoram conversão.`,
      suggestion: "Tenta responder em menos de 4h.",
    });
    recommendations.push("Configurar notificações para novos leads.");
  }

  // Positive: good conversion rate
  if (kpiData.leads.leadToOpportunityRate > 30) {
    insights.push({
      id: "good-conversion",
      type: "success",
      priority: "low",
      title: "Boa taxa de conversão",
      description: `${kpiData.leads.leadToOpportunityRate}% dos leads convertem em oportunidades.`,
    });
  }

  // Opportunity: high pipeline value
  if (kpiData.opportunities.weightedValue > 0) {
    insights.push({
      id: "pipeline-value",
      type: "opportunity",
      priority: "medium",
      title: `€${kpiData.opportunities.weightedValue.toLocaleString()} em pipeline`,
      description: "Valor ponderado baseado nas probabilidades de fecho.",
    });
  }

  // Add recommendations based on automations
  if (kpiData.efficiency.activeAutomations === 0) {
    recommendations.push("Ativar automações para poupar tempo.");
  }

  const summary = kpiData.opportunities.activeOpportunities > 0
    ? `${kpiData.opportunities.activeOpportunities} oportunidades ativas com €${kpiData.opportunities.weightedValue.toLocaleString()} em valor ponderado.`
    : "Ainda não tens oportunidades ativas. Foca em converter leads.";

  return {
    summary,
    insights: insights.slice(0, 4),
    recommendations: recommendations.slice(0, 3),
    riskAlerts,
  };
}
