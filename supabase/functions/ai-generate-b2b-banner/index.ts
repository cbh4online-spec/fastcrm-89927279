// Edge function: ai-generate-b2b-banner
// Gera o conteúdo de um banner do Portal B2B a partir de um prompt em linguagem natural.
// Usa Lovable AI Gateway (Gemini 3 Flash) com tool calling para garantir JSON estruturado.
// Os créditos são consumidos no client (useCreditWallet → consume_funnel_credits).

import { createClient } from "npm:@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-instrumentation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KIND_LABEL: Record<string, string> = {
  campaign: "Campanha promocional",
  training: "Formação / Masterclass",
  launch: "Lançamento de produto",
  education: "Conteúdo educativo / Protocolo",
};

const SYSTEM_PROMPT = `És um copywriter sénior especializado em portais B2B para profissionais de saúde, beleza e bem-estar.
Geras conteúdo para banners de hero (carrossel rotativo) num portal de parceiros profissionais.

Regras:
- Escreves SEMPRE em Português de Portugal (pt-PT), claro, profissional e orientado a benefícios.
- Tom: confiante, focado em resultado clínico ou de negócio, sem clichés de marketing.
- Eyebrow: 2-5 palavras (ex.: "Campanha do mês", "Próxima formação · 14 maio", "Novo lançamento").
- Title: máximo 70 caracteres, impactante, com verbo ou número quando faz sentido.
- Subtitle: máximo 140 caracteres, expande o título com benefício concreto.
- Description: opcional, 1 frase curta com detalhe operacional (preço mínimo, validade, formato).
- CTA label: 2-4 palavras, verbo de ação (ex.: "Ver catálogo", "Inscrever-me", "Descobrir produto").
- CTA url: caminho relativo do portal cliente. Usa apenas: "/client/catalog", "/client/assistant", "/client/diagnosis", "/client/orders". Escolhe o mais coerente.
- Theme: "light" por defeito; "dark" só se o utilizador pedir explicitamente.
- Kind: escolhe um de campaign, training, launch, education, com base na intenção do prompt.

Não inventes preços, datas ou nomes de produtos que não estejam no prompt do utilizador.`;

const TOOL = {
  type: "function",
  function: {
    name: "generate_banner",
    description: "Gera o conteúdo estruturado de um banner do Portal B2B.",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["campaign", "training", "launch", "education"],
          description: "Tipo de banner mais adequado ao prompt.",
        },
        eyebrow: { type: "string", description: "Etiqueta curta acima do título (2-5 palavras)." },
        title: { type: "string", description: "Título principal (máx 70 caracteres)." },
        subtitle: { type: "string", description: "Subtítulo (máx 140 caracteres)." },
        description: { type: "string", description: "Descrição opcional, 1 frase curta." },
        cta_label: { type: "string", description: "Texto do botão CTA (2-4 palavras)." },
        cta_url: {
          type: "string",
          description: "URL relativa do portal cliente.",
          enum: ["/client/catalog", "/client/assistant", "/client/diagnosis", "/client/orders"],
        },
        theme: { type: "string", enum: ["light", "dark"], description: "Tema visual do banner." },
      },
      required: ["kind", "eyebrow", "title", "subtitle", "cta_label", "cta_url", "theme"],
      additionalProperties: false,
    },
  },
};

interface RequestBody {
  workspace_id: string;
  prompt: string;
  hint_kind?: "campaign" | "training" | "launch" | "education";
  current?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    cta_label?: string;
    cta_url?: string;
    kind?: string;
    theme?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  let userId: string | null = null;
  let workspaceId: string | null = null;
  let model = "google/gemini-3-flash-preview";

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AuthN: validar utilizador via JWT do header
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = userData.user.id;

    const body = (await req.json()) as RequestBody;
    workspaceId = body.workspace_id;
    const prompt = (body.prompt || "").trim();
    if (!workspaceId || !prompt) {
      return new Response(JSON.stringify({ error: "workspace_id e prompt são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prompt.length > 1500) {
      return new Response(JSON.stringify({ error: "Prompt demasiado longo (máx 1500 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AuthZ: verificar acesso ao workspace (admin OU super admin OU membro)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const [adminCheck, superCheck] = await Promise.all([
      supabaseAdmin.rpc("is_workspace_admin", { _user_id: userId, _workspace_id: workspaceId }),
      supabaseAdmin.rpc("is_super_admin", { _user_id: userId }),
    ]);
    const allowed = !!adminCheck.data || !!superCheck.data;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissões para gerar banners neste workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Construir mensagem para o modelo
    const contextLines: string[] = [];
    if (body.hint_kind) contextLines.push(`Sugestão de tipo: ${KIND_LABEL[body.hint_kind] ?? body.hint_kind}`);
    if (body.current?.title) contextLines.push(`Título atual (a melhorar): ${body.current.title}`);
    if (body.current?.subtitle) contextLines.push(`Subtítulo atual: ${body.current.subtitle}`);

    const userMessage = [
      contextLines.length ? `[Contexto]\n${contextLines.join("\n")}\n` : "",
      `[Pedido do utilizador]\n${prompt}`,
    ].filter(Boolean).join("\n");

    // ── Chamar Lovable AI Gateway com tool calling
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "generate_banner" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[ai-generate-b2b-banner] AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos IA atingido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Saldo IA esgotado. Adicione fundos em Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro do gateway de IA", detail: errText.slice(0, 200) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("[ai-generate-b2b-banner] resposta sem tool_call", JSON.stringify(aiData).slice(0, 400));
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON inválido devolvido pela IA" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitização defensiva
    const banner = {
      kind: String(parsed.kind ?? "campaign"),
      eyebrow: String(parsed.eyebrow ?? "").slice(0, 80),
      title: String(parsed.title ?? "").slice(0, 140),
      subtitle: String(parsed.subtitle ?? "").slice(0, 280),
      description: String(parsed.description ?? "").slice(0, 400),
      cta_label: String(parsed.cta_label ?? "Saber mais").slice(0, 40),
      cta_url: String(parsed.cta_url ?? "/client/catalog"),
      theme: parsed.theme === "dark" ? "dark" : "light",
    };

    const usage = aiData?.usage ?? {};
    const tokensIn = Number(usage.prompt_tokens ?? 0);
    const tokensOut = Number(usage.completion_tokens ?? 0);

    // ── Logging de uso (best effort, fire-and-forget)
    try {
      logAIUsage({
        workspace_id: workspaceId,
        user_id: userId ?? undefined,
        feature: "ai-generate-b2b-banner",
        model,
        provider: "lovable-ai",
        tokens_input: tokensIn,
        tokens_output: tokensOut,
        latency_ms: Date.now() - t0,
        was_error: false,
      });
    } catch (logErr) {
      console.warn("[ai-generate-b2b-banner] logAIUsage failed:", (logErr as Error).message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        banner,
        tokens: { input: tokensIn, output: tokensOut },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[ai-generate-b2b-banner] unexpected", err);
    // Tentar logar erro
    try {
      if (workspaceId) {
        await logAIUsage({
          workspaceId,
          userId: userId ?? undefined,
          feature: "ai-generate-b2b-banner",
          model,
          provider: "lovable-ai",
          tokensInput: 0,
          tokensOutput: 0,
          latencyMs: Date.now() - t0,
          wasError: true,
          errorType: (err as Error).message?.slice(0, 100),
        });
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro inesperado", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
