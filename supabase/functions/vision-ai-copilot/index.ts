import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const log = (step: string, details?: unknown) => {
  console.log(`[VISION-AI-COPILOT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const SYSTEM_PROMPTS: Record<string, string> = {
  manifesto: `Tu és um coach de visão estratégica. Gera um manifesto pessoal/profissional inspirador com base nos dados da visão do utilizador. O manifesto deve ter:
- Um título poderoso
- 5-7 princípios orientadores
- Uma declaração de propósito
- Uma afirmação de compromisso
Responde em português de Portugal. Sê direto, inspirador e prático.`,

  sprint_plan: `Tu és um especialista em produtividade e planeamento ágil. Com base na visão e contexto do utilizador, sugere um plano de sprint quinzenal com:
- Título do sprint
- Objetivo principal
- 5-8 tarefas concretas e accionáveis com prioridade (alta/média/baixa)
- 2-3 métricas de sucesso
Responde em português de Portugal. Sê prático e orientado a resultados.`,

  daily_focus: `Tu és um coach de produtividade diária. Analisa o sprint actual e o contexto do utilizador para sugerir:
- As 3 prioridades do dia (com justificação)
- 1 quick win fácil de concluir
- 1 bloco de foco profundo recomendado
- Nível de energia sugerido para cada tarefa
Responde em português de Portugal. Sê conciso e accionável.`,

  progress_summary: `Tu és um analista de progresso estratégico. Gera um resumo executivo do progresso da visão incluindo:
- Estado geral (% concluído estimado)
- Principais conquistas
- Áreas que precisam de atenção
- Tendência (positiva/neutra/negativa)
- Recomendação para próximos passos
Responde em português de Portugal. Formato claro e estruturado.`,

  funnel_analysis: `Tu és um especialista em funis de vendas e marketing. Analisa os dados do funil ligado à visão e sugere:
- Diagnóstico do funil (pontos fortes e fracos)
- Taxa de conversão estimada por etapa
- 3-5 melhorias concretas
- Prioridade de implementação
Responde em português de Portugal. Dados concretos e sugestões accionáveis.`,
};

const TOOL_SCHEMAS: Record<string, any> = {
  manifesto: {
    name: "generate_manifesto",
    description: "Generate a vision manifesto",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        purpose: { type: "string" },
        principles: { type: "array", items: { type: "object", properties: { number: { type: "number" }, text: { type: "string" } }, required: ["number", "text"] } },
        commitment: { type: "string" },
      },
      required: ["title", "purpose", "principles", "commitment"],
    },
  },
  sprint_plan: {
    name: "generate_sprint_plan",
    description: "Generate a sprint plan",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        goal: { type: "string" },
        tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] }, description: { type: "string" } }, required: ["title", "priority"] } },
        success_metrics: { type: "array", items: { type: "string" } },
      },
      required: ["title", "goal", "tasks", "success_metrics"],
    },
  },
  daily_focus: {
    name: "generate_daily_focus",
    description: "Generate daily focus suggestions",
    parameters: {
      type: "object",
      properties: {
        priorities: { type: "array", items: { type: "object", properties: { title: { type: "string" }, reason: { type: "string" }, energy: { type: "string", enum: ["high", "medium", "low"] } }, required: ["title", "reason", "energy"] } },
        quick_win: { type: "string" },
        deep_focus: { type: "object", properties: { task: { type: "string" }, duration_minutes: { type: "number" } }, required: ["task", "duration_minutes"] },
      },
      required: ["priorities", "quick_win", "deep_focus"],
    },
  },
  progress_summary: {
    name: "generate_progress_summary",
    description: "Generate a progress summary",
    parameters: {
      type: "object",
      properties: {
        completion_percent: { type: "number" },
        trend: { type: "string", enum: ["positive", "neutral", "negative"] },
        achievements: { type: "array", items: { type: "string" } },
        attention_areas: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
      },
      required: ["completion_percent", "trend", "achievements", "attention_areas", "next_steps"],
    },
  },
  funnel_analysis: {
    name: "generate_funnel_analysis",
    description: "Generate funnel analysis",
    parameters: {
      type: "object",
      properties: {
        diagnosis: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        improvements: { type: "array", items: { type: "object", properties: { suggestion: { type: "string" }, priority: { type: "string", enum: ["high", "medium", "low"] }, impact: { type: "string" } }, required: ["suggestion", "priority"] } },
      },
      required: ["diagnosis", "strengths", "weaknesses", "improvements"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    log("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    log("User authenticated", { userId: user.id });

    const { action, visionId, workspaceId } = await req.json();

    if (!action || !visionId || !workspaceId) {
      throw new Error("Missing required: action, visionId, workspaceId");
    }

    if (!SYSTEM_PROMPTS[action]) {
      throw new Error(`Unknown action: ${action}`);
    }

    log("Processing action", { action, visionId });

    // Fetch vision context
    const { data: vision } = await supabase
      .from("vision_profiles")
      .select("*")
      .eq("id", visionId)
      .single();

    if (!vision) throw new Error("Vision not found");

    // Fetch sprints
    const { data: sprints } = await supabase
      .from("vision_sprints")
      .select("*")
      .eq("vision_id", visionId)
      .order("start_date", { ascending: false })
      .limit(5);

    // Fetch recent briefings
    const { data: briefings } = await supabase
      .from("vision_daily_briefings")
      .select("*")
      .eq("vision_id", visionId)
      .order("date", { ascending: false })
      .limit(7);

    // Fetch wins
    const { data: wins } = await supabase
      .from("vision_wins")
      .select("*")
      .eq("vision_id", visionId)
      .order("date", { ascending: false })
      .limit(10);

    const contextPrompt = `
## Contexto da Visão
- Título: ${vision.title}
- Objetivo: ${vision.objective || "Não definido"}
- Data alvo: ${vision.target_date || "Não definida"}
- Modo: ${vision.mode}
- Manifesto actual: ${vision.manifesto ? "Sim" : "Não definido"}

## Sprints recentes (${sprints?.length || 0})
${sprints?.map((s: any) => `- [${s.status}] ${s.title} (${s.start_date} → ${s.end_date}): ${s.goal || "Sem objetivo"}`).join("\n") || "Nenhum sprint"}

## Briefings recentes (${briefings?.length || 0})
${briefings?.map((b: any) => `- ${b.date}: Energia ${b.energy_level}/5, Foco: ${JSON.stringify(b.focus_items)}`).join("\n") || "Nenhum briefing"}

## Vitórias recentes (${wins?.length || 0})
${wins?.map((w: any) => `- ${w.date}: ${w.title} [${w.category || "geral"}]`).join("\n") || "Nenhuma vitória"}
`;

    const toolSchema = TOOL_SCHEMAS[action];
    const body: any = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[action] },
        { role: "user", content: contextPrompt },
      ],
      tools: [{ type: "function", function: toolSchema }],
      tool_choice: { type: "function", function: { name: toolSchema.name } },
    };

    log("Calling AI Gateway", { model: MODEL, action });

    const aiResponse = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      log("AI Gateway error", { status, text });

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tenta novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados. Adiciona créditos para continuar." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    log("AI response received");

    let result: any = null;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        result = null;
      }
    }

    if (!result) {
      // Fallback: try message content
      result = { raw: aiData.choices?.[0]?.message?.content || "Sem resultado" };
    }

    // Log AI session
    await supabase.from("vision_ai_sessions").insert({
      vision_id: visionId,
      workspace_id: workspaceId,
      user_id: user.id,
      action_type: action,
      input_context: { visionTitle: vision.title },
      output_result: result as any,
      credits_used: CREDIT_COSTS[action] || 1,
      status: "completed",
    });

    log("Action completed", { action });

    return new Response(JSON.stringify({ result, action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const CREDIT_COSTS: Record<string, number> = {
  manifesto: 5,
  sprint_plan: 3,
  daily_focus: 1,
  progress_summary: 2,
  funnel_analysis: 3,
};
