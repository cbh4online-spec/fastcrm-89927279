import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CopilotRequest {
  workspaceId: string;
  action: "diagnose" | "validate" | "analyze_churn" | "chat" | "normalize_interests" | "suggest_message" | "generate_automation";
  studentId?: string;
  cohortId?: string;
  enrollmentId?: string;
  userMessage?: string;
  interests?: string[];
  messageContext?: {
    channel: "whatsapp" | "email";
    purpose: "followup" | "welcome" | "reminder" | "congratulations";
  };
  automationDescription?: string;
}

const INTEREST_TAXONOMY = [
  "Desenvolvimento Web",
  "Desenvolvimento Mobile",
  "Data Science",
  "Machine Learning",
  "Inteligência Artificial",
  "Cloud Computing",
  "DevOps",
  "Cibersegurança",
  "Design UX/UI",
  "Gestão de Projetos",
  "Marketing Digital",
  "Business Analytics",
  "Finanças",
  "Recursos Humanos",
  "Liderança",
  "Comunicação",
  "Vendas",
  "Atendimento ao Cliente",
  "Línguas",
  "Soft Skills",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const body: CopilotRequest = await req.json();
    const { workspaceId, action, studentId, cohortId, enrollmentId, userMessage, interests, messageContext, automationDescription } = body;

    // Fetch context data based on action
    let contextData: Record<string, unknown> = {};

    if (studentId) {
      // Fetch student profile
      const { data: profile } = await supabase
        .from("sj_profiles")
        .select(`
          *,
          enrollments:sj_enrollments(
            *,
            cohort:sj_cohorts(
              *,
              course:sj_courses(*)
            )
          ),
          touchpoints:sj_touchpoints(*)
        `)
        .eq("id", studentId)
        .eq("workspace_id", workspaceId)
        .single();

      if (profile) {
        contextData.profile = profile;
        contextData.enrollments = profile.enrollments;
        contextData.touchpoints = profile.touchpoints;

        // Calculate activity metrics
        const lastActivity = profile.last_activity_at ? new Date(profile.last_activity_at) : null;
        const daysSinceActivity = lastActivity 
          ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        contextData.metrics = {
          daysSinceActivity,
          touchpointCount: profile.touchpoints?.length || 0,
          enrollmentCount: profile.enrollments?.length || 0,
          activeEnrollments: profile.enrollments?.filter((e: { status: string }) => e.status === "active").length || 0,
          completedEnrollments: profile.enrollments?.filter((e: { status: string }) => e.status === "completed").length || 0,
        };
      }
    }

    if (cohortId) {
      const { data: cohort } = await supabase
        .from("sj_cohorts")
        .select(`
          *,
          course:sj_courses(*),
          enrollments:sj_enrollments(
            *,
            profile:sj_profiles(*)
          )
        `)
        .eq("id", cohortId)
        .eq("workspace_id", workspaceId)
        .single();

      if (cohort) {
        contextData.cohort = cohort;
      }
    }

    // Build system prompt based on action
    let systemPrompt = `És o Student Journey Copilot, um assistente de IA especializado em gestão de formação e jornadas de alunos.
Responde sempre em Português de Portugal (PT-PT) com tom profissional e empresarial.
Sê conciso mas completo nas tuas análises.
Foca-te em ações práticas e recomendações acionáveis.

Estágios do ciclo de vida:
- lead: Primeiro contacto, ainda não qualificado
- prospect: Interesse demonstrado, em qualificação
- interested: Interesse confirmado em formação específica
- enrolled: Inscrito numa turma
- active: A frequentar ativamente
- completed: Concluiu formação
- inactive: Sem atividade recente
- churned: Abandonou/desistiu

Níveis de risco de desistência:
- low: Atividade regular, sem sinais de alerta
- medium: Alguma inatividade ou sinais de desinteresse
- high: Risco elevado de abandono, ação urgente necessária`;

    let userPrompt = "";

    switch (action) {
      case "diagnose":
        systemPrompt += `\n\nA tua tarefa é fazer um diagnóstico completo do perfil do aluno e identificar:
1. Estado atual e progresso no ciclo de vida
2. Riscos identificados (baseado em atividade, touchpoints, status)
3. Oportunidades de conversão ou upsell
4. Próximos passos recomendados (1-3 ações concretas)`;

        userPrompt = `Analisa o seguinte perfil de aluno e fornece um diagnóstico completo:

${JSON.stringify(contextData, null, 2)}

Estrutura a tua resposta em:
1. **Resumo do Estado**: Uma frase sobre o estado atual
2. **Diagnóstico de Conversão**: O que falta para avançar para o próximo estágio
3. **Análise de Risco**: Nível de risco e fatores identificados
4. **Recomendações**: 1-3 ações concretas e prioritárias
5. **Mensagem Sugerida**: Uma mensagem curta para contactar o aluno (se aplicável)`;
        break;

      case "validate":
        systemPrompt += `\n\nA tua tarefa é validar se um perfil de aluno está pronto para inscrição, verificando:
1. Dados de contacto completos
2. Interesses definidos
3. Histórico de interações
4. Qualquer bloqueio ou problema`;

        userPrompt = `Valida o seguinte perfil para inscrição numa formação:

${JSON.stringify(contextData, null, 2)}

Indica:
1. **Estado de Validação**: Aprovado/Pendente/Rejeitado
2. **Campos em Falta**: Lista de informações necessárias
3. **Recomendações**: Passos para completar a validação`;
        break;

      case "analyze_churn":
        systemPrompt += `\n\nA tua tarefa é analisar o risco de desistência (churn) do aluno:
1. Avaliar padrões de atividade
2. Identificar sinais de alerta
3. Comparar com perfis similares
4. Sugerir ações de retenção`;

        userPrompt = `Analisa o risco de desistência do seguinte aluno:

${JSON.stringify(contextData, null, 2)}

Estrutura a tua resposta em:
1. **Nível de Risco**: low/medium/high com justificação
2. **Fatores de Risco**: Lista de sinais identificados
3. **Probabilidade de Retenção**: Estimativa em percentagem
4. **Plano de Retenção**: 2-3 ações urgentes para evitar desistência
5. **Mensagem de Reengajamento**: Texto pronto para enviar`;
        break;

      case "normalize_interests":
        systemPrompt += `\n\nA tua tarefa é normalizar interesses em texto livre para uma taxonomia padrão.
Taxonomia disponível: ${INTEREST_TAXONOMY.join(", ")}`;

        userPrompt = `Normaliza os seguintes interesses para a taxonomia padrão:

Interesses em texto livre: ${JSON.stringify(interests)}

Responde em formato JSON:
{
  "normalized": ["interesse1", "interesse2"],
  "suggestions": ["outras sugestões baseadas no contexto"],
  "unmapped": ["interesses que não encaixam na taxonomia"]
}`;
        break;

      case "suggest_message":
        systemPrompt += `\n\nA tua tarefa é gerar uma mensagem personalizada para o aluno.
A mensagem deve ser:
- Em PT-PT com tom profissional mas cordial
- Personalizada com base no contexto do aluno
- Adequada ao canal (${messageContext?.channel || "email"})
- Focada no objetivo (${messageContext?.purpose || "followup"})`;

        userPrompt = `Gera uma mensagem para o seguinte contexto:

Perfil do aluno: ${JSON.stringify(contextData.profile, null, 2)}
Canal: ${messageContext?.channel || "email"}
Objetivo: ${messageContext?.purpose || "followup"}

Responde em formato JSON:
{
  "subject": "assunto (apenas para email)",
  "message": "corpo da mensagem",
  "callToAction": "ação sugerida",
  "tone": "tom utilizado"
}`;
        break;

      case "generate_automation":
        systemPrompt += `\n\nA tua tarefa é gerar uma automação para o módulo Student Journey.
Triggers disponíveis: profile_created, stage_changed, enrollment_created, enrollment_inactive, enrollment_completed, dropout_risk_changed
Ações disponíveis: create_task, create_touchpoint, update_dropout_risk, send_notification, create_ai_suggestion, update_stage`;

        userPrompt = `Gera uma automação baseada na seguinte descrição:

"${automationDescription}"

Responde em formato JSON:
{
  "name": "nome da automação",
  "description": "descrição clara",
  "trigger": "trigger_type",
  "trigger_config": {},
  "conditions": [
    { "field": "campo", "operator": "equals|contains|greater_than|less_than|days_since", "value": "valor" }
  ],
  "actions": [
    { "type": "action_type", "config": {} }
  ],
  "explanation": "explicação do que a automação faz"
}`;
        break;

      case "chat":
      default:
        userPrompt = `Contexto do aluno:
${JSON.stringify(contextData, null, 2)}

Pergunta do utilizador: ${userMessage || "Olá, preciso de ajuda com este aluno."}

Responde de forma útil e acionável.`;
        break;
    }

    // Call AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content || "Sem resposta do assistente.";

    // Try to parse JSON responses for structured actions
    let parsedResponse: unknown = null;
    if (["normalize_interests", "suggest_message", "generate_automation"].includes(action)) {
      try {
        // Extract JSON from response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn("Could not parse JSON response:", e);
      }
    }

    return new Response(
      JSON.stringify({
        response: responseContent,
        parsed: parsedResponse,
        action,
        context: {
          studentId,
          cohortId,
          enrollmentId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SJ Copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
