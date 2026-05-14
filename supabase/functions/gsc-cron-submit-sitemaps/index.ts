// Auto-submete sitemaps ao Google Search Console.
// Invocado por pg_cron diariamente. Protegido por header X-Cron-Secret.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "sc-domain:fastcrm.metodopare.ai";
const FEEDS = [
  "https://fastcrm.metodopare.ai/sitemap.xml",
  "https://fastcrm.metodopare.ai/sitemap-dynamic.xml",
];

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("GSC_CRON_SECRET") ?? Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY || !GSC_KEY) {
    return json({ fallback: true, error: "GSC connector not configured" }, 200);
  }

  const siteEnc = encodeURIComponent(SITE);
  const results: Array<{ feed: string; ok: boolean; status?: number; error?: string }> = [];

  for (const feed of FEEDS) {
    try {
      const res = await fetch(
        `${GATEWAY}/webmasters/v3/sites/${siteEnc}/sitemaps/${encodeURIComponent(feed)}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GSC_KEY,
          },
        },
      );
      results.push({ feed, ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() });
    } catch (e) {
      results.push({ feed, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  console.log("gsc-cron-submit-sitemaps", JSON.stringify(results));
  return json({ submitted_at: new Date().toISOString(), site: SITE, results });
});
