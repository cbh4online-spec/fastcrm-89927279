import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return new Response(JSON.stringify({ error: "slug required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: settings } = await sb
    .from("store_settings")
    .select("workspace_id, store_name, custom_domain")
    .eq("store_slug", slug)
    .single();

  if (!settings) {
    return new Response(JSON.stringify({ error: "store not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const wsId = settings.workspace_id;
  const domain = settings.custom_domain || `${SUPABASE_URL.replace("https://", "").split(".")[0]}.lovable.app`;
  const storeUrl = `https://${domain}/store/${slug}`;

  const { data: products } = await sb
    .from("products")
    .select("id, name, description, base_price, currency, sku, brand, category:categories(name), images:product_images(image_url, position), stock_status, condition, gtin")
    .eq("workspace_id", wsId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5000);

  const items = (products || []).map((p: any) => {
    const imgSorted = (p.images || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    const mainImg = imgSorted[0]?.image_url || "";
    const availability = p.stock_status === "out_of_stock" ? "out of stock" : "in stock";
    const condition = p.condition === "used" ? "used" : p.condition === "refurbished" ? "refurbished" : "new";
    const price = `${Number(p.base_price || 0).toFixed(2)} ${p.currency || "EUR"}`;
    const link = `${storeUrl}/p/${p.id}`;
    const desc = (p.description || p.name || "").replace(/<[^>]*>/g, "").slice(0, 5000);

    return `  <item>
    <id>${escapeXml(p.id)}</id>
    <title>${escapeXml((p.name || "").slice(0, 150))}</title>
    <description>${escapeXml(desc)}</description>
    <availability>${availability}</availability>
    <condition>${condition}</condition>
    <price>${escapeXml(price)}</price>
    <link>${escapeXml(link)}</link>
    <image_link>${escapeXml(mainImg)}</image_link>
    <brand>${escapeXml(p.brand || "")}</brand>
    ${p.gtin ? `<gtin>${escapeXml(p.gtin)}</gtin>` : ""}
    ${p.sku ? `<mpn>${escapeXml(p.sku)}</mpn>` : ""}
    ${p.category?.name ? `<google_product_category>${escapeXml(p.category.name)}</google_product_category>` : ""}
  </item>`;
  });

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>${escapeXml(settings.store_name || "Loja")}</title>
${items.join("\n")}
</feed>`;

  return new Response(feed, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
