import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

  // Resolve workspace
  const { data: settings } = await sb
    .from("store_settings")
    .select("workspace_id, store_name, store_description, custom_domain")
    .eq("store_slug", slug)
    .single();

  if (!settings) {
    return new Response(JSON.stringify({ error: "store not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const wsId = settings.workspace_id;
  const storeName = settings.store_name || "Loja";
  const storeDesc = settings.store_description || "";
  const domain = settings.custom_domain || `${SUPABASE_URL.replace("https://", "").split(".")[0]}.lovable.app`;
  const storeUrl = `https://${domain}/store/${slug}`;

  // Fetch products
  const { data: products } = await sb
    .from("products")
    .select("id, name, description, base_price, currency, sku, brand, category:categories(name), images:product_images(image_url, alt_text, seo_filename, position), stock_status, condition, gtin, specifications")
    .eq("workspace_id", wsId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5000);

  const items = (products || []).map((p: any) => {
    const imgSorted = (p.images || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    const mainImg = imgSorted[0]?.image_url || "";
    const additionalImgs = imgSorted.slice(1, 10).map((i: any) => i.image_url);
    const availability = p.stock_status === "out_of_stock" ? "out of stock" : "in stock";
    const condition = p.condition === "used" ? "used" : p.condition === "refurbished" ? "refurbished" : "new";
    const categoryName = p.category?.name || "";
    const price = `${Number(p.base_price || 0).toFixed(2)} ${p.currency || "EUR"}`;
    const link = `${storeUrl}/p/${p.id}`;
    const desc = (p.description || p.name || "").replace(/<[^>]*>/g, "").slice(0, 5000);

    let xml = `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml((p.name || "").slice(0, 150))}</g:title>
      <g:description>${escapeXml(desc)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(mainImg)}</g:image_link>
`;
    for (const addImg of additionalImgs) {
      xml += `      <g:additional_image_link>${escapeXml(addImg)}</g:additional_image_link>\n`;
    }
    xml += `      <g:price>${escapeXml(price)}</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>${condition}</g:condition>
`;
    if (p.brand) xml += `      <g:brand>${escapeXml(p.brand)}</g:brand>\n`;
    if (p.sku) xml += `      <g:mpn>${escapeXml(p.sku)}</g:mpn>\n`;
    if (p.gtin) xml += `      <g:gtin>${escapeXml(p.gtin)}</g:gtin>\n`;
    if (categoryName) xml += `      <g:product_type>${escapeXml(categoryName)}</g:product_type>\n`;
    xml += `    </item>`;
    return xml;
  });

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeName)}</title>
    <link>${escapeXml(storeUrl)}</link>
    <description>${escapeXml(storeDesc)}</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
