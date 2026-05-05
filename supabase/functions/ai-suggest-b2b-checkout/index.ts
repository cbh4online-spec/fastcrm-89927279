// Edge function: ai-suggest-b2b-checkout
// Sugere um KIT (conjunto coerente de produtos) ou PRODUTOS RELACIONADOS
// (cross-sells a partir de um produto âncora) usando o catálogo real do workspace.
// Créditos consumidos no client (b2b_checkout_ai_suggestion = 2 créditos).

import { createClient } from "npm:@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-instrumentation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `És um especialista em merchandising B2B para profissionais de saúde, beleza e bem-estar.
A tua tarefa é montar SUGESTÕES de venda cruzada para o checkout de um portal B2B, usando APENAS produtos do catálogo fornecido.

Regras:
- Escreves SEMPRE em Português de Portugal (pt-PT).
- NUNCA inventes produtos. Só podes referenciar IDs que estejam na lista [Catálogo].
- KIT: escolhe 2 a 5 produtos COERENTES entre si (mesma rotina, complementares, mesma área de tratamento). Sugere um nome curto e profissional + descrição clínica/comercial breve + uma % de desconto entre 5 e 15.
- RELATED: dado um produto-âncora, escolhe 3 a 6 produtos COMPLEMENTARES (não substitutos directos). Indica uma "razão" curta para cada um.
- Não devolvas explicações fora da chamada da ferramenta.`;

const TOOL_KIT = {
  type: "function",
  function: {
    name: "suggest_kit",
    description: "Sugere um kit de produtos para o checkout B2B.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome curto do kit (máx 60 caracteres)." },
        description: { type: "string", description: "Descrição clínica/comercial (máx 200 caracteres)." },
        discount_pct: { type: "number", description: "Desconto sugerido em % (5 a 15)." },
        product_ids: {
          type: "array",
          description: "IDs dos produtos do kit (2 a 5).",
          items: { type: "string" },
          minItems: 2,
          maxItems: 5,
        },
        rationale: { type: "string", description: "Porque é que este kit faz sentido (máx 200 caracteres)." },
      },
      required: ["name", "discount_pct", "product_ids", "rationale"],
      additionalProperties: false,
    },
  },
};

const TOOL_RELATED = {
  type: "function",
  function: {
    name: "suggest_related",
    description: "Sugere produtos relacionados (cross-sell) para um produto-âncora.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              reason: { type: "string", description: "Razão curta (máx 80 caracteres)." },
              weight: { type: "number", description: "Peso 1-10 (10 = mais relevante)." },
            },
            required: ["product_id", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

interface RequestBody {
  workspace_id: string;
  mode: "kit" | "related";
  prompt?: string;
  source_product_id?: string;
  category_hint?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = Date.now();
  let userId: string | null = null;
  let workspaceId: string | null = null;
  const model = "google/gemini-3-flash-preview";

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

    // ── AuthN
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
    const mode = body.mode;
    if (!workspaceId || !mode || !["kit", "related"].includes(mode)) {
      return new Response(JSON.stringify({ error: "workspace_id e mode (kit|related) são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── AuthZ
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const [adminCheck, superCheck] = await Promise.all([
      supabaseAdmin.rpc("is_workspace_admin", { _user_id: userId, _workspace_id: workspaceId }),
      supabaseAdmin.rpc("is_super_admin", { _user_id: userId }),
    ]);
    if (!adminCheck.data && !superCheck.data) {
      return new Response(JSON.stringify({ error: "Sem permissões neste workspace" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Carregar catálogo (limitado para caber no contexto do modelo)
    let anchorCategory: string | null = null;
    if (mode === "related" && body.source_product_id) {
      const { data: anchor } = await supabaseAdmin
        .from("products")
        .select("category")
        .eq("id", body.source_product_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      anchorCategory = anchor?.category ?? null;
    }

    const catalogQuery = supabaseAdmin
      .from("products")
      .select("id, name, sku, category, base_price, short_description")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .eq("b2b_published", true)
      .order("name", { ascending: true })
      .limit(120);

    const { data: catalog, error: catErr } = await catalogQuery;
    if (catErr) throw catErr;
    const catalogRows = (catalog ?? []) as any[];

    if (catalogRows.length < 3) {
      return new Response(
        JSON.stringify({
          error: "Catálogo B2B insuficiente. Active pelo menos 3 produtos no Portal B2B.",
          fallback: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Para "related", remover o âncora e priorizar mesma categoria nos primeiros 60
    let workingCatalog = catalogRows;
    if (mode === "related" && body.source_product_id) {
      workingCatalog = catalogRows.filter((p) => p.id !== body.source_product_id);
      if (anchorCategory) {
        const sameCat = workingCatalog.filter((p) => p.category === anchorCategory);
        const otherCat = workingCatalog.filter((p) => p.category !== anchorCategory);
        workingCatalog = [...sameCat, ...otherCat].slice(0, 80);
      }
    } else if (body.category_hint) {
      const same = catalogRows.filter((p) => p.category === body.category_hint);
      const other = catalogRows.filter((p) => p.category !== body.category_hint);
      workingCatalog = [...same, ...other].slice(0, 80);
    } else {
      workingCatalog = catalogRows.slice(0, 80);
    }

    const catalogText = workingCatalog
      .map((p) => `- id=${p.id} | ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}${p.category ? ` · ${p.category}` : ""} · ${Number(p.base_price ?? 0).toFixed(2)}€`)
      .join("\n");

    // ── Construir mensagem do utilizador
    let userMessage = "";
    if (mode === "kit") {
      const promptLine = (body.prompt ?? "").trim()
        ? `[Pedido]\n${(body.prompt ?? "").trim()}`
        : "[Pedido]\nSugere um kit poupança coerente baseado no catálogo abaixo.";
      const hintLine = body.category_hint ? `\n[Categoria sugerida]\n${body.category_hint}` : "";
      userMessage = `${promptLine}${hintLine}\n\n[Catálogo B2B disponível]\n${catalogText}`;
    } else {
      const anchor = catalogRows.find((p) => p.id === body.source_product_id);
      if (!anchor) {
        return new Response(JSON.stringify({ error: "Produto-âncora não encontrado no catálogo B2B" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const promptLine = (body.prompt ?? "").trim() ? `\n[Contexto adicional]\n${(body.prompt ?? "").trim()}` : "";
      userMessage = `[Produto âncora]\nid=${anchor.id} | ${anchor.name}${anchor.category ? ` · ${anchor.category}` : ""}\n\nSugere produtos COMPLEMENTARES (não substitutos) para este produto.${promptLine}\n\n[Catálogo disponível]\n${catalogText}`;
    }

    // ── Chamar Gateway
    const tool = mode === "kit" ? TOOL_KIT : TOOL_RELATED;
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
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[ai-suggest-b2b-checkout] gateway error", aiResp.status, errText);
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
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido devolvido pela IA" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validar IDs contra catálogo
    const validIds = new Set(catalogRows.map((p) => p.id));
    let suggestion: any = null;

    if (mode === "kit") {
      const ids = (parsed.product_ids ?? []).filter((id: string) => validIds.has(id));
      if (ids.length < 2) {
        return new Response(
          JSON.stringify({ error: "A IA não conseguiu sugerir um kit válido a partir do catálogo.", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const discount = Math.max(0, Math.min(50, Number(parsed.discount_pct) || 5));
      suggestion = {
        type: "kit",
        name: String(parsed.name ?? "Kit Poupança").slice(0, 80),
        description: String(parsed.description ?? "").slice(0, 240),
        rationale: String(parsed.rationale ?? "").slice(0, 240),
        discount_pct: discount,
        product_ids: ids,
      };
    } else {
      const items = (parsed.suggestions ?? [])
        .filter((s: any) => validIds.has(s.product_id) && s.product_id !== body.source_product_id)
        .slice(0, 6)
        .map((s: any) => ({
          product_id: s.product_id,
          reason: String(s.reason ?? "").slice(0, 120),
          weight: Math.max(1, Math.min(10, Number(s.weight) || 5)),
        }));
      if (items.length < 1) {
        return new Response(
          JSON.stringify({ error: "A IA não devolveu sugestões válidas.", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      suggestion = {
        type: "related",
        source_product_id: body.source_product_id,
        items,
      };
    }

    const usage = aiData?.usage ?? {};
    try {
      logAIUsage({
        workspace_id: workspaceId,
        user_id: userId ?? undefined,
        feature: "b2b_checkout_ai_suggestion",
        model,
        provider: "lovable-ai",
        tokens_input: Number(usage.prompt_tokens ?? 0),
        tokens_output: Number(usage.completion_tokens ?? 0),
        latency_ms: Date.now() - t0,
        was_error: false,
      });
    } catch (logErr) {
      console.warn("[ai-suggest-b2b-checkout] logAIUsage failed:", (logErr as Error).message);
    }

    return new Response(JSON.stringify({ success: true, suggestion }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ai-suggest-b2b-checkout] unexpected", err);
    try {
      if (workspaceId) {
        logAIUsage({
          workspace_id: workspaceId,
          user_id: userId ?? undefined,
          feature: "b2b_checkout_ai_suggestion",
          model,
          provider: "lovable-ai",
          tokens_input: 0,
          tokens_output: 0,
          latency_ms: Date.now() - t0,
          was_error: true,
          error_type: (err as Error).message?.slice(0, 100),
        });
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ error: (err as Error).message || "Erro inesperado", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
