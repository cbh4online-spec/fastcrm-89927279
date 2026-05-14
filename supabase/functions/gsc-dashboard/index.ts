// Google Search Console dashboard proxy
// Actions: overview, sitemaps, search_analytics, top_pages, inspect_url
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const DEFAULT_SITE = "sc-domain:fastcrm.metodopare.ai";
const DEFAULT_INSPECT_SITE = "https://fastcrm.metodopare.ai/";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function gscFetch(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!GSC_KEY) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY not configured");

  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`GSC ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: require a logged-in user (anti-abuso)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  let userId: string | null = null;
  try {
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    userId = user.id;
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "overview";
    const site: string = body.site ?? DEFAULT_SITE;
    const inspectSite: string = body.inspectSite ?? DEFAULT_INSPECT_SITE;
    const siteEnc = encodeURIComponent(site);


    if (action === "list_sites") {
      const data = await gscFetch(`/webmasters/v3/sites`);
      return json(data);
    }

    if (action === "sitemaps") {
      const data = await gscFetch(`/webmasters/v3/sites/${siteEnc}/sitemaps`);
      return json(data);
    }

    if (action === "submit_sitemaps") {
      const feeds: string[] = Array.isArray(body.feeds) && body.feeds.length
        ? body.feeds
        : [
            "https://fastcrm.metodopare.ai/sitemap.xml",
            "https://fastcrm.metodopare.ai/sitemap-dynamic.xml",
          ];
      const results: Array<{ feed: string; ok: boolean; error?: string }> = [];
      for (const feed of feeds) {
        try {
          await gscFetch(
            `/webmasters/v3/sites/${siteEnc}/sitemaps/${encodeURIComponent(feed)}`,
            { method: "PUT" },
          );
          results.push({ feed, ok: true });
        } catch (e) {
          results.push({ feed, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return json({ submitted: results, site });
    }

    if (action === "search_analytics") {
      const days: number = Math.min(Math.max(body.days ?? 28, 1), 90);
      const dimensions: string[] = body.dimensions ?? [];
      const rowLimit: number = Math.min(body.rowLimit ?? 25, 1000);
      const reqBody = {
        startDate: dateNDaysAgo(days),
        endDate: dateNDaysAgo(1),
        dimensions,
        rowLimit,
      };
      const data = await gscFetch(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
        method: "POST",
        body: JSON.stringify(reqBody),
      });
      return json(data);
    }

    if (action === "inspect_url") {
      const inspectionUrl: string | undefined = body.url;
      if (!inspectionUrl || typeof inspectionUrl !== "string") {
        return json({ error: "url required" }, 400);
      }
      if (inspectionUrl.length > 2048) {
        return json({ error: "url too long" }, 400);
      }
      const data = await gscFetch(`/v1/urlInspection/index:inspect`, {
        method: "POST",
        body: JSON.stringify({
          inspectionUrl,
          siteUrl: inspectSite,
          languageCode: "pt-PT",
        }),
      });
      return json(data);
    }

    if (action === "overview") {
      const days: number = Math.min(Math.max(body.days ?? 28, 1), 90);
      const startDate = dateNDaysAgo(days);
      const endDate = dateNDaysAgo(1);
      const [totals, byDate, sitemaps] = await Promise.all([
        gscFetch(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
          method: "POST",
          body: JSON.stringify({ startDate, endDate, dimensions: [], rowLimit: 1 }),
        }),
        gscFetch(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
          method: "POST",
          body: JSON.stringify({ startDate, endDate, dimensions: ["date"], rowLimit: 90 }),
        }),
        gscFetch(`/webmasters/v3/sites/${siteEnc}/sitemaps`),
      ]);
      return json({ totals, byDate, sitemaps, range: { startDate, endDate, days } });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("gsc-dashboard error", err);
    const message = err instanceof Error ? err.message : "internal_error";
    // Resilient: 200 OK + fallback (per project core memory)
    return json({ fallback: true, error: message }, 200);
  }
});
