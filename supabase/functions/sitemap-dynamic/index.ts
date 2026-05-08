// FastCRM — Sitemap dinâmico
// Gera XML com todas as entidades SEO publicadas (blog, glossary, keywords, etc.)
// Acessível em: https://<project>.supabase.co/functions/v1/sitemap-dynamic
// Mapear para /sitemap-dynamic.xml via Cloudflare Worker ou redirect.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE_URL = Deno.env.get("PUBLIC_BASE_URL") ?? "https://fastcrm.metodopare.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento entity_type → prefixo de URL público
const TYPE_PREFIX: Record<string, string> = {
  blog_post: "/blog",
  guide: "/guides",
  glossary_term: "/glossary",
  keyword: "/keywords",
  template: "/templates",
  tool: "/tools",
  comparison: "/compare",
  category: "/categories",
};

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("seo_entities")
      .select("entity_type, slug, priority, change_frequency, published_at, canonical_url")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[sitemap-dynamic] db error", error);
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" } },
      );
    }

    const urls = (data ?? [])
      .map((row) => {
        const prefix = TYPE_PREFIX[row.entity_type as string];
        if (!prefix || !row.slug) return null;
        const loc = row.canonical_url || `${BASE_URL}${prefix}/${row.slug}`;
        const lastmod = row.published_at
          ? new Date(row.published_at as string).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const priority = (row.priority ?? 0.6).toString();
        const changefreq = row.change_frequency ?? "monthly";
        return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${escapeXml(changefreq)}</changefreq>\n    <priority>${escapeXml(priority)}</priority>\n  </url>`;
      })
      .filter(Boolean)
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[sitemap-dynamic] fatal", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" } },
    );
  }
});
