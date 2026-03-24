import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";
import { firecrawl } from "../_shared/firecrawl-client.ts";

const PAGE_TYPE_PATTERNS: [RegExp, string][] = [
  [/\/(about|sobre|quem-somos|who-we-are)/i, "about"],
  [/\/(products?|produtos?|solutions?|solucoes)/i, "products"],
  [/\/(services?|servicos?)/i, "services"],
  [/\/(pricing|precos?|plans?|planos?)/i, "pricing"],
  [/\/(customers?|clientes?|case.?stud|testimonials?)/i, "customers"],
  [/\/(careers?|jobs?|vagas|trabalhe|hiring)/i, "careers"],
  [/\/(team|equipa?|leadership|founders?)/i, "team"],
  [/\/(contact|contacto?|fale.?conosco)/i, "contact"],
  [/\/(blog|news|noticias|insights)/i, "blog"],
  [/\/(industries?|industrias?|sectors?|setores)/i, "industries"],
  [/\/(partners?|parceiros?)/i, "partners"],
  [/\/(integrations?|integracoes)/i, "integrations"],
  [/\/(docs?|documentation|help|faq|support)/i, "docs"],
  [/\/(locations?|offices?|localizacao)/i, "locations"],
];

function classifyUrl(url: string): string {
  const path = new URL(url).pathname.toLowerCase();
  if (path === "/" || path === "") return "homepage";
  for (const [pattern, type] of PAGE_TYPE_PATTERNS) {
    if (pattern.test(path)) return type;
  }
  return "other";
}

function isRelevantUrl(url: string, domain: string): boolean {
  try {
    const u = new URL(url);
    if (!u.hostname.includes(domain.replace(/^www\./, ""))) return false;
    const path = u.pathname.toLowerCase();
    // Skip anchors, files, fragments
    if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js|xml|json|ico)$/i.test(path)) return false;
    if (path.split("/").length > 5) return false;
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, domain, runId } = await req.json();
    if (!accountId || !workspaceId || !domain) {
      return new Response(JSON.stringify({ error: "accountId, workspaceId e domain obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Normalize domain
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    const fullUrl = `https://${cleanDomain}`;

    console.log(`[discover] Mapping ${fullUrl} for account ${accountId}`);

    // Use firecrawl map to discover pages
    const mapResult = await firecrawl.map(fullUrl);

    if (!mapResult.success || !mapResult.links?.length) {
      console.warn("[discover] Map returned no links, using homepage only");
      // At minimum, add homepage
      await supabase.from("account_brief_urls").upsert({
        workspace_id: workspaceId,
        account_id: accountId,
        url: fullUrl,
        page_type: "homepage",
        discovery_method: "fallback",
        is_active: true,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "account_id,url" });

      return new Response(JSON.stringify({ success: true, discovered: 1, urls: [fullUrl] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter and classify
    const relevant = mapResult.links
      .filter((u) => isRelevantUrl(u, cleanDomain))
      .slice(0, 30); // Cap at 30

    const classified = relevant.map((url) => ({
      workspace_id: workspaceId,
      account_id: accountId,
      url,
      page_type: classifyUrl(url),
      discovery_method: "firecrawl_map",
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }));

    // Ensure homepage is included
    if (!classified.some((c) => c.page_type === "homepage")) {
      classified.unshift({
        workspace_id: workspaceId,
        account_id: accountId,
        url: fullUrl,
        page_type: "homepage",
        discovery_method: "firecrawl_map",
        is_active: true,
        last_seen_at: new Date().toISOString(),
      });
    }

    // Prioritize important pages (max 15 for crawl)
    const priority = ["homepage", "about", "products", "services", "pricing", "customers", "careers", "team", "contact", "industries", "partners", "integrations"];
    const sorted = [...classified].sort((a, b) => {
      const ai = priority.indexOf(a.page_type);
      const bi = priority.indexOf(b.page_type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // Upsert URLs
    const { error: upsertError } = await supabase
      .from("account_brief_urls")
      .upsert(sorted, { onConflict: "account_id,url", ignoreDuplicates: true });

    if (upsertError) console.error("[discover] Upsert error:", upsertError);

    // Update run if provided
    if (runId) {
      await supabase
        .from("account_brief_analysis_runs")
        .update({ pages_discovered: sorted.length, status: "processing" })
        .eq("id", runId);
    }

    console.log(`[discover] Found ${sorted.length} relevant URLs`);

    return new Response(JSON.stringify({
      success: true,
      discovered: sorted.length,
      urls: sorted.slice(0, 15).map((u) => u.url),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[discover] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
