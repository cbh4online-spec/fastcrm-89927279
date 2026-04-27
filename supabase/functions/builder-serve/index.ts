// Edge function pública: serve HTML publicado de um builder asset.
// Lookup por:
//  - ?slug=xxx&workspace=uuid  (URL canónica fastcrm.lovable.app/p/{slug})
//  - host header + path        (custom domain verificado)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function notFoundHtml(reason = "Página não encontrada") {
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>404</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#e2e8f0}.box{text-align:center;max-width:480px;padding:2rem}h1{font-size:4rem;margin:0;color:#3b82f6}p{opacity:.7}</style>
</head><body><div class="box"><h1>404</h1><p>${reason}</p></div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const workspace = url.searchParams.get("workspace");
    const hostnameParam = url.searchParams.get("hostname");
    const pathParam = url.searchParams.get("path");

    // Inferir host real (X-Forwarded-Host > Host header > param)
    const hostname =
      hostnameParam ||
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      null;
    const path = pathParam || url.pathname || "/";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("get_published_builder_asset", {
      _hostname: hostname,
      _path: path,
      _slug: slug,
      _workspace: workspace,
    });

    if (error) {
      console.error("[builder-serve] rpc error", error);
      return new Response(notFoundHtml("Erro ao carregar"), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.html) {
      return new Response(notFoundHtml(), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(row.html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "X-Builder-Asset": row.asset_id ?? "",
      },
    });
  } catch (e) {
    console.error("[builder-serve] fatal", e);
    return new Response(notFoundHtml("Erro inesperado"), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
