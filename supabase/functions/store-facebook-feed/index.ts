// Feed público de produtos (RSS/XML Google Merchant) para o Meta Commerce Manager.
// Uso: GET /functions/v1/store-facebook-feed?slug=<store_slug>
// Só expõe produtos publicados na loja (dados já públicos na loja online).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_DOMAIN = "fastcrm.metodopare.ai";
const DEFAULT_VAT = 23;

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug || !/^[a-z0-9-]{1,80}$/i.test(slug)) return json({ error: "slug required" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: settings } = await sb
    .from("store_settings")
    .select("workspace_id, store_name, custom_domain")
    .eq("store_slug", slug)
    .maybeSingle();
  if (!settings) return json({ error: "store not found" }, 404);

  const domain = (settings.custom_domain || DEFAULT_DOMAIN).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const storeUrl = `https://${domain}/store/${slug}`;

  const all: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await sb
      .from("products")
      .select("id, name, short_description, commercial_description, base_price, currency, sku, mpn, brand, gtin, barcode, category, images, primary_image_index, stock_status, stock_quantity, track_stock, product_condition, store_slug, tax_rate_estimate_pct")
      .eq("workspace_id", settings.workspace_id)
      .eq("store_published", true)
      .eq("status", "active")
      .gt("base_price", 0)
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) {
      console.error("[store-facebook-feed]", error.message);
      return json({ error: "feed_unavailable" }, 500);
    }
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const items = all.map((p) => {
    const imgs: string[] = Array.isArray(p.images) ? p.images.filter((u: unknown) => typeof u === "string" && u) : [];
    const main = imgs[p.primary_image_index ?? 0] || imgs[0] || "";
    const extra = imgs.filter((u) => u !== main).slice(0, 10);
    // Meta (UE) exige preço com IVA; base_price é guardado sem IVA.
    const vat = Number(p.tax_rate_estimate_pct ?? DEFAULT_VAT);
    const gross = Number(p.base_price) * (1 + vat / 100);
    const out = p.stock_status === "out_of_stock" || (p.track_stock && Number(p.stock_quantity ?? 0) <= 0 && p.stock_status !== "available");
    const condition = p.product_condition === "used" ? "used" : p.product_condition === "refurbished" ? "refurbished" : "new";
    const desc = String(p.short_description || p.commercial_description || p.name || "").replace(/<[^>]*>/g, "").slice(0, 5000);
    const gtin = p.gtin || p.barcode;
    return [
      "    <item>",
      `      <g:id>${esc(p.sku || p.id)}</g:id>`,
      `      <g:title>${esc(String(p.name || "").slice(0, 150))}</g:title>`,
      `      <g:description>${esc(desc)}</g:description>`,
      `      <g:link>${esc(`${storeUrl}/product/${p.store_slug || p.id}`)}</g:link>`,
      `      <g:image_link>${esc(main)}</g:image_link>`,
      ...extra.map((u) => `      <g:additional_image_link>${esc(u)}</g:additional_image_link>`),
      `      <g:price>${gross.toFixed(2)} ${esc(p.currency || "EUR")}</g:price>`,
      `      <g:availability>${out ? "out of stock" : "in stock"}</g:availability>`,
      `      <g:condition>${condition}</g:condition>`,
      `      <g:brand>${esc(p.brand || settings.store_name || "Loja")}</g:brand>`,
      p.mpn || p.sku ? `      <g:mpn>${esc(p.mpn || p.sku)}</g:mpn>` : "",
      gtin ? `      <g:gtin>${esc(gtin)}</g:gtin>` : "",
      p.category ? `      <g:product_type>${esc(p.category)}</g:product_type>` : "",
      "    </item>",
    ].filter(Boolean).join("\n");
  });

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(settings.store_name || "Loja")}</title>
    <link>${esc(storeUrl)}</link>
    <description>Catálogo de produtos</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
});
