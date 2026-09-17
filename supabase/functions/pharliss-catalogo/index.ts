import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Catálogo público-restrito do workspace PHARLISS.
 *
 * Devolve apenas `sku`, `name` e `images`. Nunca devolve custos, margens,
 * fornecedores, stock ou preços. Inclui produtos não publicados na loja.
 * Protegido por `Authorization: Bearer <PHARLISS_CATALOGO_TOKEN>`.
 */

const PHARLISS_WORKSPACE_ID = "0662fc16-6286-4156-a908-08c7dfec0fb7";
const PAGE_SIZE = 1000;

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Comparação em tempo constante para evitar timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT_MAX;
}

function parsePositiveInt(raw: string | null, fallback: number | null, max: number): number | null {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > max) return null;
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const expected = Deno.env.get("PHARLISS_CATALOGO_TOKEN");
  if (!expected) {
    console.error("PHARLISS_CATALOGO_TOKEN não configurado");
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !safeEqual(match[1].trim(), expected)) {
    console.warn(`pharliss-catalogo: autenticação falhada (ip=${ip})`);
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  if (statusParam !== null && !["active", "inactive", "draft", "archived", "all"].includes(statusParam)) {
    return jsonResponse({ error: "invalid_status" }, 400);
  }
  const limit = parsePositiveInt(url.searchParams.get("limit"), null, 100_000);
  const offset = parsePositiveInt(url.searchParams.get("offset"), 0, 100_000);
  if (limit === null && url.searchParams.get("limit") !== null) {
    return jsonResponse({ error: "invalid_limit" }, 400);
  }
  if (offset === null) {
    return jsonResponse({ error: "invalid_offset" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    type Row = { id: string; sku: string | null; name: string | null; images: string[] | null };
    const rows: Row[] = [];
    const hardLimit = limit ?? Number.MAX_SAFE_INTEGER;
    let cursor = offset ?? 0;

    while (rows.length < hardLimit) {
      const pageSize = Math.min(PAGE_SIZE, hardLimit - rows.length);
      let query = supabase
        .from("products")
        .select("id, sku, name, images")
        .eq("workspace_id", PHARLISS_WORKSPACE_ID)
        .order("name", { ascending: true })
        .range(cursor, cursor + pageSize - 1);

      if (statusParam && statusParam !== "all") query = query.eq("status", statusParam);

      const { data, error } = await query;
      if (error) throw error;
      const page = (data ?? []) as Row[];
      rows.push(...page);
      if (page.length < pageSize) break;
      cursor += page.length;
    }

    // Fallback de imagens: produtos sem `images` recorrem à galeria.
    const missing = rows.filter((r) => !Array.isArray(r.images) || r.images.length === 0).map((r) => r.id);
    const galleryByProduct = new Map<string, string[]>();
    for (let i = 0; i < missing.length; i += 200) {
      const chunk = missing.slice(i, i + 200);
      const { data, error } = await supabase
        .from("product_images")
        .select("product_id, image_url, is_primary, position, created_at")
        .in("product_id", chunk)
        .order("is_primary", { ascending: false })
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      for (const img of (data ?? []) as { product_id: string; image_url: string }[]) {
        if (!img.image_url) continue;
        const list = galleryByProduct.get(img.product_id) ?? [];
        list.push(img.image_url);
        galleryByProduct.set(img.product_id, list);
      }
    }

    const products = rows.map((r) => ({
      sku: r.sku,
      name: r.name,
      images: Array.isArray(r.images) && r.images.length > 0 ? r.images : (galleryByProduct.get(r.id) ?? []),
    }));

    return new Response(
      JSON.stringify({ workspace: "PHARLISS", count: products.length, products }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    console.error("pharliss-catalogo error", e instanceof Error ? e.message : e);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
