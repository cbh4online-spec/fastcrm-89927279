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

    // Injecta snippet de tracking + banner de consentimento antes de </body>
    const supabaseUrl = SUPABASE_URL;
    const trackerSnippet = `
<script>(function(){
  var ASSET="${row.asset_id}";
  var SLUG="${(slug || "").replace(/"/g, "")}";
  var API="${supabaseUrl}/rest/v1/rpc/track_builder_event";
  var KEY="${Deno.env.get("SUPABASE_ANON_KEY") || ""}";
  var STORE="lov_builder_consent";
  var SES="lov_builder_session";
  function uuid(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,function(c){return(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)})}
  function sid(){var s=sessionStorage.getItem(SES);if(!s){s=uuid();sessionStorage.setItem(SES,s)}return s}
  function consent(){return localStorage.getItem(STORE)}
  function send(type, meta){
    if(consent()!=="yes")return;
    try{
      fetch(API,{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY},body:JSON.stringify({_asset_id:ASSET,_event_type:type,_slug:SLUG,_hostname:location.hostname,_path:location.pathname,_referrer:document.referrer,_user_agent:navigator.userAgent,_session_id:sid(),_metadata:meta||{}})}).catch(function(){});
    }catch(e){}
  }
  function pageview(){send("view")}
  function bind(){
    document.addEventListener("click",function(e){var t=e.target.closest("a,button");if(t)send("click",{tag:t.tagName,text:(t.innerText||"").slice(0,80),href:t.href||null})},true);
    document.addEventListener("submit",function(e){send("form_submit",{id:e.target.id||null,name:e.target.name||null})},true);
  }
  function banner(){
    if(consent())return;
    var b=document.createElement("div");
    b.setAttribute("role","dialog");
    b.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font:14px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3)";
    b.innerHTML='<span style="flex:1;min-width:200px">Esta página utiliza cookies para medir audiência de forma anónima.</span><button data-a="no" style="background:transparent;color:#cbd5e1;border:1px solid #475569;border-radius:8px;padding:8px 14px;cursor:pointer">Recusar</button><button data-a="yes" style="background:#3b82f6;color:#fff;border:0;border-radius:8px;padding:8px 14px;cursor:pointer">Aceitar</button>';
    document.body.appendChild(b);
    b.addEventListener("click",function(e){var a=e.target.getAttribute("data-a");if(!a)return;localStorage.setItem(STORE,a);b.remove();if(a==="yes")pageview()});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){bind();banner();pageview()});
  else{bind();banner();pageview()}
})();</script>`;

    let html = row.html as string;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${trackerSnippet}</body>`);
    } else {
      html = html + trackerSnippet;
    }

    return new Response(html, {
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
