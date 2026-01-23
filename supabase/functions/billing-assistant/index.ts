import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-ASSISTANT] ${step}${detailsStr}`);
};

interface AssistantContext {
  opportunity?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
  events?: Record<string, unknown>[];
  automations?: Record<string, unknown>[];
  metrics?: {
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    pastDueCount: number;
    churnRisk: number;
  };
}

interface AssistantRequest {
  workspaceId: string;
  opportunityId?: string;
  subscriptionId?: string;
  action: "diagnose" | "validate" | "recommend" | "chat" | "create_automation";
  userMessage?: string;
  conversationHistory?: { role: string; content: string }[];
}

const SYSTEM_PROMPT = `És o Assistente de Billing & Recorrência do FastCRM. O teu papel é ajudar utilizadores a gerir oportunidades recorrentes, subscrições e pagamentos.

REGRAS IMPORTANTES:
1. Responde SEMPRE em Português de Portugal (PT-PT), tom profissional mas acessível.
2. Sê CONCISO - respostas curtas e acionáveis.
3. NUNCA inventes dados - se faltar informação, pergunta especificamente.
4. Termina SEMPRE com:
   - **Próxima Ação:** [ação específica]
   - **Risco se não agir:** [consequência concreta]

CONHECIMENTO:
- Subscrições podem ter status: active, past_due, paused, cancelled, trial, pending
- Frequências: weekly, monthly, quarterly, semi_annual, yearly
- MRR = Monthly Recurring Revenue; ARR = MRR × 12; TCV = Total Contract Value
- Automações disponíveis: payment_failed→past_due, payment_succeeded→active, renewal_approaching (7 dias), canceled→churn

VALIDAÇÕES IMPORTANTES:
- Oportunidade recorrente DEVE ter: mrr_amount, frequency, start_date, renewal_date
- Subscrição DEVE estar ligada a contact_id OU company_id
- next_payment_date deve ser > hoje para subscrições ativas
- past_due > 7 dias é risco crítico de churn

DIAGNÓSTICO:
Quando pedido diagnóstico, verifica:
1. Campos obrigatórios preenchidos
2. Datas coerentes (renewal > start, next_payment > last_payment)
3. Status consistente entre oportunidade e subscrição
4. Automações ativas e relevantes
5. Histórico de pagamentos (eventos)

RECOMENDAÇÕES:
Baseadas em:
- Status atual e tempo nesse status
- Histórico de eventos recentes
- Comparação com métricas do workspace
- Boas práticas de gestão de subscrições`;

function buildContextMessage(context: AssistantContext): string {
  return `
CONTEXTO ATUAL DO UTILIZADOR:
${context.opportunity ? `
OPORTUNIDADE:
- ID: ${context.opportunity.id}
- Título: ${context.opportunity.title}
- Status: ${context.opportunity.status}
- Valor: €${context.opportunity.value || 0}
- É recorrente: ${context.opportunity.is_recurring ? 'Sim' : 'Não'}
- MRR: €${context.opportunity.mrr_amount || 0}
- Frequência: ${context.opportunity.frequency || 'N/A'}
- Data início: ${context.opportunity.start_date || 'N/A'}
- Data renovação: ${context.opportunity.renewal_date || 'N/A'}
- Status subscrição: ${context.opportunity.subscription_status || 'N/A'}
- Último pagamento: ${context.opportunity.last_payment_date || 'N/A'}
- Próximo pagamento: ${context.opportunity.next_payment_date || 'N/A'}
` : 'Nenhuma oportunidade selecionada.'}

${context.subscription ? `
SUBSCRIÇÃO:
- ID: ${context.subscription.id}
- Status: ${context.subscription.status}
- MRR: €${context.subscription.mrr_amount || 0}
- Frequência: ${context.subscription.frequency}
- Data início: ${context.subscription.start_date}
- Data renovação: ${context.subscription.renewal_date}
- Último pagamento: ${context.subscription.last_payment_date || 'N/A'}
- Próximo pagamento: ${context.subscription.next_payment_date || 'N/A'}
- Provider: ${context.subscription.provider}
- Cancelada em: ${context.subscription.canceled_at || 'N/A'}
- Razão churn: ${context.subscription.churn_reason || 'N/A'}
` : 'Nenhuma subscrição selecionada.'}

${context.events && context.events.length > 0 ? `
ÚLTIMOS EVENTOS (${context.events.length}):
${context.events.map((e, i) => `${i + 1}. [${e.occurred_at}] ${e.event_type}: ${e.notes || 'sem notas'} ${e.amount ? `€${e.amount}` : ''}`).join('\n')}
` : 'Sem eventos recentes.'}

${context.automations && context.automations.length > 0 ? `
AUTOMAÇÕES CONFIGURADAS (${context.automations.length}):
${context.automations.map(a => `- ${a.name} (${a.is_active ? 'Ativa' : 'Inativa'}): trigger=${a.trigger}`).join('\n')}
` : 'Sem automações configuradas.'}

${context.metrics ? `
MÉTRICAS DO WORKSPACE:
- MRR Total: €${context.metrics.mrr.toFixed(2)}
- ARR Total: €${context.metrics.arr.toFixed(2)}
- Subscrições Ativas: ${context.metrics.activeSubscriptions}
- Em Atraso (past_due): ${context.metrics.pastDueCount}
- Risco de Churn: ${context.metrics.churnRisk}%
` : 'Métricas não disponíveis.'}
`;
}

async function callLovableAI(
  messages: { role: string; content: string }[],
  context: AssistantContext
): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY não configurada");
  }

  const contextMessage = buildContextMessage(context);

  // Build messages for Lovable AI
  const aiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: contextMessage },
    { role: "assistant", content: "Contexto carregado. Analisei os dados disponíveis." },
    ...messages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }))
  ];

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: aiMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logStep("Lovable AI error", { status: response.status, error });
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  
  if (!text) {
    throw new Error("No response from AI");
  }

  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body: AssistantRequest = await req.json();
    const { workspaceId, opportunityId, subscriptionId, action, userMessage, conversationHistory } = body;

    logStep("Request received", { workspaceId, action, opportunityId, subscriptionId });

    // Build context
    const context: AssistantContext = {};

    // Fetch opportunity if provided
    if (opportunityId) {
      const { data: opp } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", opportunityId)
        .single();
      context.opportunity = opp;
    }

    // Fetch subscription if provided
    if (subscriptionId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscriptionId)
        .single();
      context.subscription = sub;
    } else if (opportunityId) {
      // Try to find linked subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub) context.subscription = sub;
    }

    // Fetch last 20 events
    if (context.subscription) {
      const { data: events } = await supabase
        .from("subscription_events")
        .select("*")
        .eq("subscription_id", (context.subscription as { id: string }).id)
        .order("occurred_at", { ascending: false })
        .limit(20);
      context.events = events || [];
    }

    // Fetch automations
    const { data: automations } = await supabase
      .from("automation_rules")
      .select("id, name, trigger, is_active")
      .eq("workspace_id", workspaceId)
      .limit(20);
    context.automations = automations || [];

    // Calculate metrics
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("status, mrr_amount")
      .eq("workspace_id", workspaceId);

    if (subscriptions) {
      const active = subscriptions.filter(s => s.status === "active");
      const pastDue = subscriptions.filter(s => s.status === "past_due");
      const mrr = active.reduce((sum, s) => sum + (s.mrr_amount || 0), 0);
      
      context.metrics = {
        mrr,
        arr: mrr * 12,
        activeSubscriptions: active.length,
        pastDueCount: pastDue.length,
        churnRisk: subscriptions.length > 0 
          ? Math.round((pastDue.length / subscriptions.length) * 100) 
          : 0
      };
    }

    // Build messages based on action
    let messages: { role: string; content: string }[] = conversationHistory || [];

    switch (action) {
      case "diagnose":
        messages.push({
          role: "user",
          content: "Faz um diagnóstico completo da situação atual. Verifica se há problemas de configuração, campos em falta, ou inconsistências. Sê específico sobre o que está bem e o que precisa de atenção."
        });
        break;

      case "validate":
        messages.push({
          role: "user",
          content: "Valida se a oportunidade/subscrição está corretamente configurada para faturação recorrente. Lista campos obrigatórios, verifica coerência de datas, e indica o que está em falta ou incorreto."
        });
        break;

      case "recommend":
        messages.push({
          role: "user",
          content: "Com base no estado atual e histórico, qual é a recomendação mais importante agora? Considera urgência, risco de churn, e próximos passos imediatos."
        });
        break;

      case "create_automation":
        messages.push({
          role: "user",
          content: userMessage || "Sugere automações relevantes para esta situação. Descreve trigger, condições e ações de forma clara."
        });
        break;

      case "chat":
      default:
        if (userMessage) {
          messages.push({ role: "user", content: userMessage });
        }
        break;
    }

    if (messages.length === 0) {
      messages.push({
        role: "user",
        content: "Olá! Como posso ajudar com billing e recorrência?"
      });
    }

    // Call AI
    const response = await callLovableAI(messages, context);
    logStep("AI response generated", { length: response.length });

    return new Response(
      JSON.stringify({ 
        response,
        context: {
          hasOpportunity: !!context.opportunity,
          hasSubscription: !!context.subscription,
          eventCount: context.events?.length || 0,
          automationCount: context.automations?.length || 0,
          metrics: context.metrics
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Error", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
