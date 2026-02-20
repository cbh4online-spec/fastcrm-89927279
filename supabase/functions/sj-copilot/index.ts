import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CopilotRequest {
  workspaceId: string;
  action: "diagnose" | "validate" | "analyze_churn" | "chat" | "normalize_interests" | "suggest_message" | "generate_automation" | "generate_recommendations" | "explain_recommendation" | "generate_invitation";
  studentId?: string;
  cohortId?: string;
  enrollmentId?: string;
  userMessage?: string;
  interests?: string[];
  messageContext?: {
    channel: "whatsapp" | "email";
    purpose: "followup" | "welcome" | "reminder" | "congratulations" | "course_invitation";
  };
  automationDescription?: string;
  // Recommendation context
  courseId?: string;
  recommendationId?: string;
  matchScore?: number;
  matchReasons?: string[];
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

Deno.serve(async (req) => {
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
    const { workspaceId, action, studentId, cohortId, enrollmentId, userMessage, interests, messageContext, automationDescription, courseId, recommendationId, matchScore, matchReasons } = body;

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

    // Fetch course info if courseId provided (for recommendations)
    if (courseId) {
      const { data: course } = await supabase
        .from("sj_courses")
        .select("*")
        .eq("id", courseId)
        .eq("workspace_id", workspaceId)
        .single();

      if (course) {
        contextData.course = course;
      }
    }

    // Fetch recommendation info if recommendationId provided
    if (recommendationId) {
      const { data: recommendation } = await supabase
        .from("sj_course_recommendations")
        .select(`
          *,
          profile:sj_profiles(*),
          course:sj_courses(*)
        `)
        .eq("id", recommendationId)
        .single();

      if (recommendation) {
        contextData.recommendation = recommendation;
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

REGRAS CRÍTICAS (OBRIGATÓRIAS):
1. NUNCA INVENTES DADOS - usa APENAS informação presente no contexto fornecido
2. Se faltar informação essencial, PEDE EXPLICITAMENTE os campos em falta (nome do campo + tipo de dado esperado)
3. TODAS as respostas DEVEM incluir obrigatoriamente:
   a) **Situação Atual**: Estado factual baseado nos dados
   b) **Risco**: Nível (low/medium/high) com justificação baseada em dados concretos
   c) **Próxima Ação Recomendada**: 1 ação específica, prioritária e acionável

Responde sempre em Português de Portugal (PT-PT) com tom profissional e empresarial.
Sê conciso mas completo nas tuas análises.
Foca-te em ações práticas e recomendações acionáveis.
Quando não tiveres dados suficientes, indica claramente: "Dados insuficientes para [X]. Necessito de: [lista de campos]."

Estágios do ciclo de vida:
- lead: Primeiro contacto, ainda não qualificado
- prospect: Interesse demonstrado, em qualificação
- interested: Interesse confirmado em formação específica
- enrolled: Inscrito numa turma
- active: A frequentar ativamente
- completed: Concluiu formação
- inactive: Sem atividade recente
- churned: Abandonou/desistiu

Níveis de risco de desistência (usa APENAS dados reais para classificar):
- low: Atividade nos últimos 3 dias, touchpoints recentes, status ativo
- medium: Sem atividade 4-7 dias, poucos touchpoints, sinais de desinteresse
- high: Sem atividade >7 dias, sem resposta a follow-ups, status problemático`;

    let userPrompt = "";

    switch (action) {
      case "diagnose":
        systemPrompt += `\n\nA tua tarefa é fazer um diagnóstico completo do perfil do aluno.
ATENÇÃO: Analisa APENAS os dados fornecidos. NÃO assumes valores.`;

        userPrompt = `Analisa o seguinte perfil de aluno:

${JSON.stringify(contextData, null, 2)}

RESPONDE OBRIGATORIAMENTE com esta estrutura:

## Situação Atual
[Descreve o estado atual baseado APENAS nos dados - stage, score, última atividade]

## Risco
[Nível: low/medium/high]
[Justificação com dados concretos: dias sem atividade, nº de touchpoints, status das inscrições]

## Próxima Ação Recomendada
[1 ação específica e acionável - ex: "Ligar ao aluno para confirmar interesse na turma X"]

## Dados em Falta (se aplicável)
[Lista campos necessários para melhor análise]`;
        break;

      case "validate":
        systemPrompt += `\n\nA tua tarefa é validar se um perfil de aluno está pronto para inscrição.
Verifica: dados de contacto, interesses definidos, histórico de interações.`;

        userPrompt = `Valida o seguinte perfil para inscrição:

${JSON.stringify(contextData, null, 2)}

RESPONDE OBRIGATORIAMENTE com esta estrutura:

## Situação Atual
[Estado de validação: Aprovado/Pendente/Rejeitado + resumo dos dados disponíveis]

## Risco
[Risco de a inscrição falhar ou ter problemas - low/medium/high com justificação]

## Próxima Ação Recomendada
[1 passo concreto para completar ou avançar a validação]

## Campos em Falta
[Lista ESPECÍFICA: nome do campo + tipo de dado esperado]`;
        break;

      case "analyze_churn":
        systemPrompt += `\n\nA tua tarefa é analisar o risco de desistência (churn) do aluno.
Usa APENAS métricas presentes nos dados: last_activity_at, touchpoints, enrollment status.`;

        userPrompt = `Analisa o risco de desistência:

${JSON.stringify(contextData, null, 2)}

RESPONDE OBRIGATORIAMENTE com esta estrutura:

## Situação Atual
[Estado factual: última atividade há X dias, Y touchpoints, Z inscrições ativas/completas]

## Risco
[Nível: low/medium/high]
[Fatores identificados nos dados - NÃO inventes padrões]

## Próxima Ação Recomendada
[1 ação urgente de retenção com prazo sugerido]

## Mensagem de Reengajamento (opcional)
[Apenas se houver dados suficientes para personalizar]`;
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

      case "generate_recommendations":
        systemPrompt += `\n\nA tua tarefa é analisar o perfil do aluno e sugerir os melhores cursos com base no histórico.
REGRAS:
- NÃO inventes pré-requisitos ou dados que não existam
- Se faltarem interesses/tags, sugere ao utilizador completar esses campos
- Justifica cada recomendação com razões específicas baseadas nos dados`;

        userPrompt = `Analisa o perfil do aluno e sugere recomendações de cursos:

Perfil: ${JSON.stringify(contextData.profile, null, 2)}
Histórico de inscrições: ${JSON.stringify(contextData.enrollments, null, 2)}

Sugere os TOP 3 cursos mais adequados com:
1. Nome do curso ideal
2. Razões específicas (ex: "Concluiu X, progressão natural", "Interesse em Y")
3. Score estimado (0-100)
4. Próxima ação recomendada

Se os dados estiverem incompletos, indica quais campos precisam ser preenchidos antes de recomendar.

Responde em formato JSON:
{
  "recommendations": [
    {
      "courseType": "tipo de curso sugerido",
      "score": 85,
      "reasons": ["razão 1", "razão 2", "razão 3"],
      "nextAction": "ação recomendada"
    }
  ],
  "dataQuality": {
    "hasInterests": true/false,
    "hasCompletedCourses": true/false,
    "missingFields": ["campo1", "campo2"]
  }
}`;
        break;

      case "explain_recommendation":
        systemPrompt += `\n\nA tua tarefa é explicar de forma clara e detalhada porque um curso específico é recomendado para este aluno.
Usa linguagem simples e direta, focando nos benefícios concretos.`;

        userPrompt = `Explica porque este curso é recomendado:

Perfil do aluno: ${JSON.stringify(contextData.profile, null, 2)}
Curso recomendado: ${JSON.stringify(contextData.course, null, 2)}
Score de match: ${matchScore || "N/A"}
Razões do sistema: ${JSON.stringify(matchReasons || [], null, 2)}

Gera uma explicação em 3-4 frases que:
1. Conecte o histórico do aluno com o curso
2. Explique os benefícios da progressão
3. Mencione o timing adequado (se aplicável)

Responde em formato JSON:
{
  "explanation": "texto explicativo completo",
  "keyBenefits": ["benefício 1", "benefício 2"],
  "urgencyNote": "nota sobre timing (opcional)"
}`;
        break;

      case "generate_invitation":
        systemPrompt += `\n\nA tua tarefa é gerar uma mensagem de convite personalizada para um curso.
A mensagem deve ser:
- Em PT-PT com tom profissional mas cordial
- Personalizada com base no perfil e histórico do aluno
- Curta e focada (máximo 3 parágrafos para email, 2-3 frases para WhatsApp)
- Com CTA claro`;

        const courseInfo = (contextData as Record<string, unknown>).course || ((contextData as Record<string, unknown>).recommendation as Record<string, unknown>)?.course;
        const profileInfo = (contextData as Record<string, unknown>).profile || ((contextData as Record<string, unknown>).recommendation as Record<string, unknown>)?.profile;

        userPrompt = `Gera uma mensagem de convite para curso:

Perfil do aluno: ${JSON.stringify(profileInfo, null, 2)}
Curso: ${JSON.stringify(courseInfo, null, 2)}
Canal: ${messageContext?.channel || "email"}
Score de match: ${matchScore || "N/A"}
Razões do match: ${JSON.stringify(matchReasons || [], null, 2)}

A mensagem deve:
1. Cumprimentar pelo nome
2. Referenciar formação anterior (se existir)
3. Apresentar o curso como progressão natural
4. Incluir CTA claro (inscrição, mais informações, agendar chamada)

Responde em formato JSON:
{
  "subject": "assunto (apenas para email)",
  "message": "corpo da mensagem",
  "callToAction": "texto do CTA",
  "tone": "tom utilizado",
  "personalizationUsed": ["elemento personalizado 1", "elemento 2"]
}`;
        break;

      case "chat":
      default:
        userPrompt = `Contexto do aluno:
${JSON.stringify(contextData, null, 2)}

Pergunta do utilizador: ${userMessage || "Olá, preciso de ajuda com este aluno."}

LEMBRA-TE: A tua resposta DEVE incluir sempre:
1. **Situação Atual** - baseada nos dados fornecidos
2. **Risco** - nível e justificação
3. **Próxima Ação Recomendada** - 1 passo concreto

Se não tiveres dados suficientes, indica explicitamente o que precisas.`;
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
    if (["normalize_interests", "suggest_message", "generate_automation", "generate_recommendations", "explain_recommendation", "generate_invitation"].includes(action)) {
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
