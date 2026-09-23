import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper ───────────────────────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature,
        model,
        tokens_input: 0,
        tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true,
        error_type: "network",
      });
    }
    throw e;
  }

  if (!workspaceId) return response;

  const clone = response.clone();
  clone.json().then((data: any) => {
    logAIUsage({
      workspace_id: workspaceId,
      feature,
      model,
      tokens_input: data?.usage?.prompt_tokens ?? 0,
      tokens_output: data?.usage?.completion_tokens ?? 0,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});

  return response;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PARALLEL_GATEWAY = "https://connector-gateway.lovable.dev/parallel";

/** Margem mínima de segurança quando não existe regra configurada. */
const DEFAULT_MIN_MARGIN_PCT = 15;

/** Desconto aplicado ao concorrente mais barato (1% abaixo). */
const UNDERCUT_FACTOR = 0.99;

type Competitor = {
  name: string;
  price: number;
  url: string;
  vat_included?: boolean | null;
  collected_at: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type PageHit = { url: string; title?: string; excerpts: string[] };

/** Termos de setor para evitar decomposição semântica do código (ex. "Side"/"Cover"). */
const SECTOR_HINT = "loja online preço euros distribuidor";

/** Constrói queries com correspondência exata obrigatória do código do artigo. */
function buildQueries(
  sku: string | null,
  barcode: string | null,
  productName: string,
  brand: string | null
): string[] {
  const q: string[] = [];
  if (sku) {
    q.push(`"${sku}"`);
    q.push(`"${sku}" ${SECTOR_HINT}`);
    if (brand) q.push(`"${sku}" ${brand} comprar preço`);
  }
  if (barcode) q.push(`"${barcode}" preço`);
  if (!q.length) q.push(`"${productName}" ${brand ?? ""} preço Portugal`.trim());
  return q.slice(0, 4);
}

/** Descoberta de páginas de venda reais com o código do artigo (Parallel, modo rápido). */
async function searchCompetitorPages(
  sku: string | null,
  barcode: string | null,
  productName: string,
  brand: string | null
): Promise<PageHit[]> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("PARALLEL_API_KEY");
  if (!lovableKey || !connectionKey) return [];

  try {
    const resp = await fetch(`${PARALLEL_GATEWAY}/v1/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        objective:
          `Localizar páginas de lojas e distribuidores (Portugal, Espanha, UE) que vendam o artigo` +
          (sku ? ` com a referência exata "${sku}"` : ` "${productName}"`) +
          (barcode ? ` ou o código de barras ${barcode}` : "") +
          `, indicando o preço de venda em euros. Ignora páginas de artigos diferentes da referência.`,
        search_queries: buildQueries(sku, barcode, productName, brand),
        mode: "fast",
        advanced_settings: { max_results: 10 },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      console.warn("[MARKET-RESEARCH] parallel search failed", resp.status, (await resp.text()).slice(0, 300));
      return [];
    }

    const data = await resp.json().catch(() => null) as any;
    const results: any[] = data?.results ?? data?.data ?? [];
    return results
      .map((r) => ({
        url: String(r?.url ?? ""),
        title: typeof r?.title === "string" ? r.title : undefined,
        excerpts: Array.isArray(r?.excerpts)
          ? r.excerpts.map((e: unknown) => String(e).slice(0, 1200))
          : [String(r?.content ?? r?.excerpt ?? "").slice(0, 1200)].filter(Boolean),
      }))
      .filter((r) => r.url.startsWith("http"));
  } catch (err) {
    console.warn("[MARKET-RESEARCH] parallel search error", (err as Error).message);
    return [];
  }
}

/** Pesquisa complementar de retalho (Firecrawl) — cobre lojas que o motor rápido não devolve. */
async function searchRetailPages(
  sku: string | null,
  barcode: string | null,
  productName: string
): Promise<PageHit[]> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return [];
  const query = sku ? `"${sku}" preço` : barcode ? `"${barcode}" preço` : `${productName} preço`;

  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) {
      console.warn("[MARKET-RESEARCH] firecrawl search failed", resp.status);
      return [];
    }
    const data = await resp.json().catch(() => null) as any;
    const results: any[] = data?.data ?? [];
    return results
      .map((r) => ({
        url: String(r?.url ?? ""),
        title: typeof r?.title === "string" ? r.title : undefined,
        excerpts: [String(r?.description ?? r?.markdown ?? "").slice(0, 1200)].filter(Boolean),
      }))
      .filter((r) => r.url.startsWith("http") && !r.url.toLowerCase().endsWith(".pdf"));
  } catch (err) {
    console.warn("[MARKET-RESEARCH] firecrawl search error", (err as Error).message);
    return [];
  }
}

/** Lê os blocos Schema.org/JSON-LD da página e devolve o preço estruturado declarado. */
function extractStructuredPrice(html: string): { price: number; currency: string | null } | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const found: Array<{ price: number; currency: string | null }> = [];

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    const rawPrice = obj.price ?? obj.lowPrice;
    if (rawPrice !== undefined && rawPrice !== null) {
      const num = Number(String(rawPrice).replace(",", "."));
      if (Number.isFinite(num) && num > 0 && num < 1_000_000) {
        const cur = typeof obj.priceCurrency === "string" ? obj.priceCurrency : null;
        found.push({ price: Math.round(num * 100) / 100, currency: cur });
      }
    }
    for (const value of Object.values(obj)) visit(value);
  };

  for (const block of blocks) {
    try {
      visit(JSON.parse(block[1].trim()));
    } catch {
      // bloco inválido: ignorar
    }
  }

  const euro = found.filter((f) => !f.currency || f.currency.toUpperCase() === "EUR");
  if (!euro.length) return null;
  euro.sort((a, b) => a.price - b.price);
  return euro[0];
}

function normalizeRef(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Mantém apenas páginas onde a referência exata aparece no URL, título ou conteúdo. */
function filterRelevantPages(pages: PageHit[], sku: string | null): PageHit[] {
  if (!sku) return pages;
  const ref = normalizeRef(sku);
  if (ref.length < 5) return pages;
  const relevant = pages.filter((p) => {
    const haystack = normalizeRef(`${p.url} ${p.title ?? ""} ${p.excerpts.join(" ")}`);
    return haystack.includes(ref);
  });
  return relevant.length ? relevant : pages;
}

/** Enriquece as páginas com o preço declarado em Schema.org quando o excerto não o traz. */
async function enrichWithStructuredPrices(pages: PageHit[]): Promise<PageHit[]> {
  const targets = pages.slice(0, 12);
  const enriched = await Promise.all(
    targets.map(async (page) => {
      const hasPrice = page.excerpts.some((e) => /(\d+[.,]\d{2}\s*€|€\s*\d+[.,]\d{2}|EUR\s*\d)/.test(e));
      if (hasPrice) return page;
      try {
        const resp = await fetch(page.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FastCRM/1.0)" },
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) return page;
        const html = (await resp.text()).slice(0, 900_000);
        const structured = extractStructuredPrice(html);
        if (!structured) return page;
        return {
          ...page,
          excerpts: [
            ...page.excerpts,
            `Preço declarado nos dados estruturados desta página (Schema.org): ${structured.price.toFixed(2)} ${structured.currency ?? "EUR"}`,
          ],
        };
      } catch {
        return page;
      }
    })
  );
  return [...enriched, ...pages.slice(12)];
}

/** Débito autoritário de créditos no workspace do cliente. */
async function debitCredits(
  admin: any,
  workspaceId: string,
  userId: string,
  productId: string
): Promise<{ ok: boolean; message?: string; consumed?: number; balance?: number }> {
  const bucket = Math.floor(Date.now() / 60000);
  const { data, error } = await admin.rpc("consume_funnel_credits", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_action_key: "product_market_research",
    p_idempotency_key: `product-market-research:${workspaceId}:${productId}:${bucket}`,
    p_reference_type: "product_market_research",
    p_reference_id: productId,
    p_metadata: { source: "ai-market-price-research" },
  });
  if (error) {
    console.error("[MARKET-RESEARCH] consume_funnel_credits error:", error.message);
    return { ok: false, message: "Não foi possível validar os créditos." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.success) return { ok: false, message: row?.message || "Créditos insuficientes." };
  return { ok: true, consumed: row.credits_consumed, balance: row.balance_remaining };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    const productName = typeof payload.product_name === "string" ? payload.product_name.trim().slice(0, 300) : "";
    const workspaceId = typeof payload.workspace_id === "string" ? payload.workspace_id : "";
    const productId = typeof payload.product_id === "string" ? payload.product_id : "";
    const sku = typeof payload.sku === "string" && payload.sku.trim() ? payload.sku.trim().slice(0, 80) : null;
    const barcode = typeof payload.barcode === "string" && payload.barcode.trim() ? payload.barcode.trim().slice(0, 40) : null;
    const category = typeof payload.category === "string" ? payload.category.slice(0, 120) : null;
    const brand = typeof payload.brand === "string" && payload.brand.trim() ? payload.brand.trim().slice(0, 80) : null;
    const costPrice = typeof payload.cost_price === "number" && payload.cost_price > 0 ? payload.cost_price : null;
    const minMarginPct = typeof payload.min_margin_pct === "number" && payload.min_margin_pct >= 0
      ? payload.min_margin_pct
      : DEFAULT_MIN_MARGIN_PCT;
    // Os preços das lojas online são PVP com IVA incluído; o custo é sempre líquido.
    const vatRate = typeof payload.vat_rate === "number" && payload.vat_rate >= 0 && payload.vat_rate < 100
      ? payload.vat_rate
      : 23;


    if (!productName || !workspaceId || !productId) {
      return json({ error: "product_name, workspace_id e product_id são obrigatórios" }, 400);
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return json({ error: "Not a workspace member" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Créditos antes de qualquer chamada paga
    const debit = await debitCredits(admin, workspaceId, user.id, productId);
    if (!debit.ok) {
      return json({ error: debit.message, code: "insufficient_credits" }, 402);
    }

    // 1) Descoberta híbrida de páginas reais (motor rápido + pesquisa de retalho)
    const [fastPages, retailPages] = await Promise.all([
      searchCompetitorPages(sku, barcode, productName, brand),
      searchRetailPages(sku, barcode, productName),
    ]);

    const byUrl = new Map<string, PageHit>();
    for (const page of [...fastPages, ...retailPages]) {
      const existing = byUrl.get(page.url);
      if (existing) {
        existing.excerpts = [...new Set([...existing.excerpts, ...page.excerpts])];
      } else {
        byUrl.set(page.url, { ...page });
      }
    }
    const discovered = [...byUrl.values()];

    if (!discovered.length) {
      return json({
        success: true,
        grounded: false,
        competitors: [],
        market_summary: sku
          ? `Nenhuma loja encontrada com a referência ${sku}. Não foi estimado nenhum preço.`
          : "Nenhuma loja encontrada para este artigo. Não foi estimado nenhum preço.",
        credits_consumed: debit.consumed,
        credits_balance: debit.balance,
      });
    }

    // 2) Filtro de relevância + leitura dos dados estruturados (Schema.org)
    const relevant = filterRelevantPages(discovered, sku);
    const pages = await enrichWithStructuredPrices(relevant);

    const allowedUrls = new Set(pages.map((p) => p.url));
    const context = pages
      .map((p, i) => `[Fonte ${i + 1}] URL: ${p.url}\nTítulo: ${p.title ?? "N/A"}\nConteúdo: ${p.excerpts.join(" \u2022 ").slice(0, 1500)}`)
      .join("\n\n---\n\n");

    // 3) Extração estritamente ancorada nas fontes
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const systemPrompt = `És um extrator de preços. Regras absolutas:
1. Só podes devolver preços que estejam LITERALMENTE escritos no conteúdo das fontes fornecidas, incluindo os preços indicados como "Preço declarado nos dados estruturados desta página (Schema.org)" — esses são preços reais da loja e devem ser usados.
2. É PROIBIDO estimar, arredondar por categoria, inferir ou inventar qualquer valor.
3. Cada preço tem de vir acompanhado do URL exato da fonte onde aparece (copiado da lista).
4. Ignora páginas que vendam apenas acessórios, packs de várias unidades, produtos usados ou artigos diferentes da referência pedida.
5. Ignora páginas institucionais, comparadores genéricos, listas de lojas físicas, redes sociais e páginas sem a referência pedida.
6. Se nenhuma fonte contiver um preço verificável para este artigo, devolve a lista de concorrentes vazia.
Responde em português de Portugal.`;

    const userPrompt = `Artigo: ${productName}
${sku ? `Referência (SKU): ${sku}` : ""}
${barcode ? `Código de barras (EAN): ${barcode}` : ""}
${brand ? `Marca: ${brand}` : ""}
${category ? `Categoria: ${category}` : ""}

Fontes recolhidas:
${context}`;

    const aiResp = await __loggedAIFetch(workspaceId, "ai-market-price-research", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "extract_real_prices",
              description: "Devolve apenas preços literalmente presentes nas fontes fornecidas",
              parameters: {
                type: "object",
                properties: {
                  competitors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome da loja/distribuidor" },
                        price: { type: "number", description: "Preço em euros tal como aparece na fonte" },
                        url: { type: "string", description: "URL exato copiado da lista de fontes" },
                        vat_included: { type: "boolean", description: "Verdadeiro se o preço inclui IVA" },
                      },
                      required: ["name", "price", "url"],
                    },
                  },
                  market_summary: { type: "string", description: "Resumo factual em português, sem estimativas" },
                },
                required: ["competitors", "market_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_real_prices" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Demasiados pedidos. Tente novamente em instantes." }, 429);
      if (aiResp.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const extracted = args ? JSON.parse(args) : { competitors: [], market_summary: "" };

    const now = new Date().toISOString();
    let competitors: Competitor[] = (Array.isArray(extracted.competitors) ? extracted.competitors : [])
      .filter((c: any) => typeof c?.url === "string" && allowedUrls.has(c.url))
      .filter((c: any) => typeof c?.price === "number" && c.price > 0 && c.price < 1_000_000)
      .map((c: any) => ({
        name: String(c.name || hostOf(c.url) || "Loja").slice(0, 120),
        price: Math.round(c.price * 100) / 100,
        url: c.url,
        vat_included: typeof c.vat_included === "boolean" ? c.vat_included : null,
        collected_at: now,
      }));

    // Um preço por domínio (o mais barato)
    const byHost = new Map<string, Competitor>();
    for (const c of competitors) {
      const h = hostOf(c.url) || c.url;
      const prev = byHost.get(h);
      if (!prev || c.price < prev.price) byHost.set(h, c);
    }
    competitors = [...byHost.values()];

    // 3) Filtro anti-outliers
    if (competitors.length >= 3) {
      const med = median(competitors.map((c) => c.price));
      competitors = competitors.filter((c) => c.price >= med * 0.3 && c.price <= med * 3);
    }
    if (costPrice) {
      competitors = competitors.filter((c) => c.price >= costPrice * 0.5);
    }
    competitors.sort((a, b) => a.price - b.price);

    if (!competitors.length) {
      return json({
        success: true,
        grounded: false,
        competitors: [],
        market_summary: sku
          ? `Nenhum preço verificável encontrado para a referência ${sku}. Nada foi estimado.`
          : "Nenhum preço verificável encontrado. Nada foi estimado.",
        sources: pages.map((p) => p.url),
        credits_consumed: debit.consumed,
        credits_balance: debit.balance,
      });
    }

    const prices = competitors.map((c) => c.price);
    const marketMin = prices[0];
    const marketMax = prices[prices.length - 1];
    const marketAvg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

    // 4) Proteção de margem
    const undercut = Math.round(marketMin * UNDERCUT_FACTOR * 100) / 100;
    const floorPrice = costPrice ? Math.ceil((costPrice / (1 - minMarginPct / 100)) * 100) / 100 : null;
    const marginBlocked = !!(floorPrice && undercut < floorPrice);
    const suggestedPrice = marginBlocked ? floorPrice! : undercut;
    const suggestedMarginPct = costPrice
      ? Math.round(((suggestedPrice - costPrice) / suggestedPrice) * 1000) / 10
      : null;

    const marginNote = marginBlocked
      ? ` Atenção: acompanhar o concorrente mais barato (${marketMin.toFixed(2)} €) violaria a margem mínima de ${minMarginPct}%. O preço sugerido foi travado em ${suggestedPrice.toFixed(2)} €.`
      : "";

    await admin.from("product_market_research").insert({
      workspace_id: workspaceId,
      product_id: productId,
      market_avg_price: marketAvg,
      market_min_price: marketMin,
      market_max_price: marketMax,
      competitors_json: competitors,
      suggested_price: suggestedPrice,
      suggested_margin_pct: suggestedMarginPct,
      research_source: "parallel_grounded",
      model_used: "gemini-3-flash-preview",
    });

    return json({
      success: true,
      grounded: true,
      market_avg_price: marketAvg,
      market_min_price: marketMin,
      market_max_price: marketMax,
      suggested_price: suggestedPrice,
      suggested_margin_pct: suggestedMarginPct,
      margin_blocked: marginBlocked,
      min_margin_pct: minMarginPct,
      competitors,
      sources: pages.map((p) => p.url),
      market_summary: String(extracted.market_summary || "").slice(0, 1000) + marginNote,
      credits_consumed: debit.consumed,
      credits_balance: debit.balance,
    });
  } catch (e) {
    console.error("[MARKET-RESEARCH] Error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
