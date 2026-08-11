import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const workspaceSlug = url.searchParams.get("slug");

    if (!workspaceSlug) {
      return new Response("Missing slug parameter", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve workspace
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .single();

    if (!ws) {
      return new Response("Workspace not found", { status: 404, headers: corsHeaders });
    }

    // Get published products
    const { data: products } = await supabase
      .from("products")
      .select("id, store_slug, updated_at")
      .eq("workspace_id", ws.id)
      .eq("store_published", true)
      .order("updated_at", { ascending: false })
      .limit(1000);

    const baseUrl = url.searchParams.get("base_url") || "https://fastcrm.lovable.app";
    const storeBase = `${baseUrl}/store/${workspaceSlug}`;
    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${storeBase}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${storeBase}/wishlist</loc>
    <changefreq>weekly</changefreq>
    <priority>0.3</priority>
  </url>`;

    if (products) {
      for (const p of products) {
        const lastmod = p.updated_at ? p.updated_at.split("T")[0] : now;
        xml += `
  <url>
    <loc>${storeBase}/product/${p.store_slug || p.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    xml += `\n</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
