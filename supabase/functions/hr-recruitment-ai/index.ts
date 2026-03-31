import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  screen_cv: `És um especialista de RH em triagem de CVs. Analisa o CV do candidato em relação aos requisitos da vaga e devolve:
- score (0-100): adequação do candidato
- reasoning: justificação em português de Portugal (3-5 pontos)
- strengths: pontos fortes relevantes
- gaps: lacunas identificadas
- recommendation: "advance" | "review" | "reject"
Sê objectivo e profissional. Responde APENAS com o JSON pedido via tool call.`,

  generate_description: `És um copywriter de RH. Gera uma descrição de vaga profissional e atractiva em português de Portugal com:
- summary: resumo da posição (2-3 frases)
- responsibilities: lista de responsabilidades (5-8 itens)
- requirements: lista de requisitos (5-8 itens)
- benefits: lista de benefícios (3-5 itens)
- tone: profissional mas acolhedor
Responde APENAS com o JSON pedido via tool call.`,

  generate_questions: `És um entrevistador experiente. Gera perguntas de entrevista personalizadas em português de Portugal:
- questions: lista de 8-10 perguntas, cada uma com:
  - question: a pergunta
  - category: "technical" | "behavioral" | "cultural" | "experience"
  - what_to_look_for: o que avaliar na resposta
Adapta ao perfil do candidato e requisitos da vaga. Responde APENAS com o JSON pedido via tool call.`,

  summarize_candidate: `És um analista de RH. Cria um resumo executivo do candidato em português de Portugal:
- summary: resumo de 3-5 frases
- key_skills: competências principais
- experience_level: "junior" | "mid" | "senior" | "executive"
- cultural_fit_notes: notas sobre fit cultural
- overall_impression: impressão geral
Responde APENAS com o JSON pedido via tool call.`,

  generate_email: `És um profissional de RH. Gera um email profissional e empático em português de Portugal:
- subject: assunto do email
- body: corpo do email (HTML simples)
Adapta o tom ao tipo de email (convite, rejeição, oferta, follow-up). Responde APENAS com o JSON pedido via tool call.`,
};

const TOOLS: Record<string, any> = {
  screen_cv: {
    type: "function",
    function: {
      name: "cv_screening_result",
      description: "Return CV screening results",
      parameters: {
        type: "object",
        properties: {
          score: { type: "number", description: "0-100 fit score" },
          reasoning: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          gaps: { type: "array", items: { type: "string" } },
          recommendation: { type: "string", enum: ["advance", "review", "reject"] },
        },
        required: ["score", "reasoning", "strengths", "gaps", "recommendation"],
      },
    },
  },
  generate_description: {
    type: "function",
    function: {
      name: "job_description_result",
      description: "Return generated job description",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          responsibilities: { type: "array", items: { type: "string" } },
          requirements: { type: "array", items: { type: "string" } },
          benefits: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "responsibilities", "requirements", "benefits"],
      },
    },
  },
  generate_questions: {
    type: "function",
    function: {
      name: "interview_questions_result",
      description: "Return interview questions",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                category: { type: "string", enum: ["technical", "behavioral", "cultural", "experience"] },
                what_to_look_for: { type: "string" },
              },
              required: ["question", "category", "what_to_look_for"],
            },
          },
        },
        required: ["questions"],
      },
    },
  },
  summarize_candidate: {
    type: "function",
    function: {
      name: "candidate_summary_result",
      description: "Return candidate summary",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_skills: { type: "array", items: { type: "string" } },
          experience_level: { type: "string", enum: ["junior", "mid", "senior", "executive"] },
          cultural_fit_notes: { type: "string" },
          overall_impression: { type: "string" },
        },
        required: ["summary", "key_skills", "experience_level", "overall_impression"],
      },
    },
  },
  generate_email: {
    type: "function",
    function: {
      name: "email_result",
      description: "Return generated email",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["subject", "body"],
      },
    },
  },
};

function buildUserPrompt(action: string, payload: Record<string, unknown>): string {
  switch (action) {
    case "screen_cv":
      return `Vaga: ${payload.job_title}\n\nRequisitos da vaga:\n${payload.job_requirements}\n\nCV do candidato:\n${payload.cv_text}`;
    case "generate_description":
      return `Título da vaga: ${payload.title}\nDepartamento: ${payload.department || "N/A"}\nContexto adicional: ${payload.context || "N/A"}`;
    case "generate_questions":
      return `Perfil do candidato:\n${payload.candidate_profile}\n\nRequisitos da vaga:\n${payload.job_requirements}`;
    case "summarize_candidate":
      return `Dados do candidato:\n${JSON.stringify(payload.candidate_data, null, 2)}`;
    case "generate_email":
      return `Tipo de email: ${payload.email_type}\nNome do candidato: ${payload.candidate_name}\nVaga: ${payload.job_title}\nContexto: ${payload.context || "N/A"}`;
    default:
      return JSON.stringify(payload);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, payload } = await req.json();

    if (!action || !SYSTEM_PROMPTS[action]) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tool = TOOLS[action];
    const toolName = tool.function.name;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[action] },
          { role: "user", content: buildUserPrompt(action, payload) },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Adicione créditos de IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return content directly
    const content = data.choices?.[0]?.message?.content;
    return new Response(JSON.stringify({ result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hr-recruitment-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
