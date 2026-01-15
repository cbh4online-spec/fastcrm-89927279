import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DashboardData {
  hotLeads: number;
  leadsToday: number;
  conversationsWithoutResponse: number;
  activeOpportunities: number;
  forecastedRevenue: number;
  avgResponseTimeHours: number;
  leadsWithoutFollowup: number;
  activeAutomations: number;
  recentLeadNames?: string[];
  topOpportunityName?: string;
  topOpportunityValue?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dashboardData, userName, workspaceName } = await req.json() as {
      dashboardData: DashboardData;
      userName?: string;
      workspaceName?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Ás um copiloto de CRM inteligente que ajuda gestores e vendedores a decidir rapidamente.
    
Regras:
- Sê MUITO conciso e direto
- Usa linguagem simples e humana em Português (Portugal)
- Foca em ações imediatas, não em análises genéricas
- Prioriza problemas reais (leads quentes, conversas pendentes)
- Nunca uses texto genérico ou frases vazias
- Cada insight deve ter no máximo 15 palavras
- O status do dia deve ter no máximo 20 palavras

Formato de resposta (JSON):
{
  "greeting": "Saudação curta personalizada (ex: Bom dia, João!)",
  "dayStatus": "Uma frase sobre o estado atual do negócio com números específicos",
  "insights": [
    {
      "id": "unique_id",
      "type": "urgent|opportunity|efficiency|warning",
      "priority": "high|medium|low", 
      "title": "Título curto e acionável",
      "description": "Descrição curta com contexto",
      "actionLabel": "Texto do botão de ação",
      "actionRoute": "/dashboard/...",
      "entityName": "Nome da entidade se aplicável"
    }
  ],
  "nextActions": [
    {
      "id": "action_id",
      "type": "lead|inbox|opportunity|task",
      "priority": "high|medium|low",
      "title": "Ação clara e curta",
      "reason": "Porquê esta ação agora",
      "actionRoute": "/dashboard/..."
    }
  ],
  "efficiencyMetrics": {
    "timeSavedHours": number (estimativa baseada nas automações ativas),
    "responseImprovement": "mensagem curta se aplicável"
  }
}`;

    const userPrompt = `Dados atuais do CRM:
- Leads quentes: ${dashboardData.hotLeads}
- Leads hoje: ${dashboardData.leadsToday}
- Conversas sem resposta: ${dashboardData.conversationsWithoutResponse}
- Oportunidades ativas: ${dashboardData.activeOpportunities}
- Receita prevista: €${dashboardData.forecastedRevenue}
- Tempo médio de resposta: ${dashboardData.avgResponseTimeHours}h
- Leads sem follow-up: ${dashboardData.leadsWithoutFollowup}
- Automações ativas: ${dashboardData.activeAutomations}
${dashboardData.recentLeadNames?.length ? `- Leads recentes: ${dashboardData.recentLeadNames.join(", ")}` : ""}
${dashboardData.topOpportunityName ? `- Maior oportunidade: ${dashboardData.topOpportunityName} (€${dashboardData.topOpportunityValue})` : ""}

Utilizador: ${userName || "Utilizador"}
Workspace: ${workspaceName || "CRM"}
Hora atual: ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}

Gera o resumo do dashboard com insights acionáveis.`;

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
    
    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return fallback response
      parsed = {
        greeting: `Olá, ${userName || "Utilizador"}!`,
        dayStatus: dashboardData.hotLeads > 0 
          ? `Tens ${dashboardData.hotLeads} lead${dashboardData.hotLeads > 1 ? "s" : ""} quente${dashboardData.hotLeads > 1 ? "s" : ""} e ${dashboardData.conversationsWithoutResponse} conversa${dashboardData.conversationsWithoutResponse > 1 ? "s" : ""} sem resposta.`
          : "O teu CRM está atualizado. Bom trabalho!",
        insights: [],
        nextActions: [],
        efficiencyMetrics: { timeSavedHours: dashboardData.activeAutomations * 2 }
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Dashboard insights error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
