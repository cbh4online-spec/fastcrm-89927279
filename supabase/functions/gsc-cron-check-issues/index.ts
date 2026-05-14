// Verifica problemas no GSC (sitemaps, indexação, canonical, rastreio) e
// guarda alertas em public.gsc_alerts. Invocado por pg_cron OU pela edge
// gsc-dashboard com action=check_issues. Protegido por X-Cron-Secret OU
// Service Role.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-cron-secret, apikey, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "sc-domain:fastcrm.metodopare.ai";
const INSPECT_SITE = "https://fastcrm.metodopare.ai/";
// URLs críticas a inspeccionar a cada execução (não exceder quota: GSC ~2k/dia)
const PRIORITY_URLS = [
  "https://fastcrm.metodopare.ai/",
  "https://fastcrm.metodopare.ai/leadchef/precos",
  "https://fastcrm.metodopare.ai/precos",
  "https://fastcrm.metodopare.ai/funcionalidades",
  "https://fastcrm.metodopare.ai/sobre",
  "https://fastcrm.metodopare.ai/contacto",
  "https://fastcrm.metodopare.ai/casos",
  "https://fastcrm.metodopare.ai/carreiras",
];

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function gscFetch(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY || !GSC_KEY) throw new Error("GSC connector not configured");
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
  if (!res.ok) throw new Error(`GSC ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

interface Alert {
  alert_type: string;
  severity: "info" | "warning" | "critical";
  url: string | null;
  title: string;
  message: string;
  details: Record<string, unknown>;
}

function fp(a: Alert) {
  return `${a.alert_type}|${a.url ?? "-"}|${a.title}`.slice(0, 240);
}

async function checkSitemaps(): Promise<Alert[]> {
  const out: Alert[] = [];
  try {
    const data = await gscFetch(`/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps`) as {
      sitemap?: Array<{ path: string; warnings?: string; errors?: string; isPending?: boolean; lastDownloaded?: string }>;
    };
    for (const s of data.sitemap ?? []) {
      const errs = Number(s.errors ?? 0);
      const warns = Number(s.warnings ?? 0);
      if (errs > 0) {
        out.push({
          alert_type: "sitemap_error",
          severity: "critical",
          url: s.path,
          title: `Sitemap com ${errs} erro(s)`,
          message: `O sitemap ${s.path} tem ${errs} erro(s) reportado(s) pelo Google.`,
          details: { warnings: warns, errors: errs, lastDownloaded: s.lastDownloaded },
        });
      } else if (warns > 0) {
        out.push({
          alert_type: "sitemap_warning",
          severity: "warning",
          url: s.path,
          title: `Sitemap com ${warns} aviso(s)`,
          message: `O sitemap ${s.path} tem ${warns} aviso(s).`,
          details: { warnings: warns, errors: errs, lastDownloaded: s.lastDownloaded },
        });
      }
      if (s.isPending) {
        out.push({
          alert_type: "sitemap_pending",
          severity: "info",
          url: s.path,
          title: "Sitemap pendente de processamento",
          message: `O sitemap ${s.path} ainda não foi processado pelo Google.`,
          details: { lastDownloaded: s.lastDownloaded },
        });
      }
    }
  } catch (e) {
    console.error("checkSitemaps", e);
  }
  return out;
}

async function checkUrls(): Promise<Alert[]> {
  const out: Alert[] = [];
  for (const url of PRIORITY_URLS) {
    try {
      const data = await gscFetch(`/v1/urlInspection/index:inspect`, {
        method: "POST",
        body: JSON.stringify({ inspectionUrl: url, siteUrl: INSPECT_SITE, languageCode: "pt-PT" }),
      }) as {
        inspectionResult?: {
          indexStatusResult?: {
            verdict?: string;
            coverageState?: string;
            robotsTxtState?: string;
            pageFetchState?: string;
            googleCanonical?: string;
            userCanonical?: string;
          };
        };
      };
      const idx = data.inspectionResult?.indexStatusResult;
      if (!idx) continue;

      // Não indexada
      if (idx.verdict && idx.verdict !== "PASS") {
        out.push({
          alert_type: "url_not_indexed",
          severity: idx.verdict === "FAIL" ? "critical" : "warning",
          url,
          title: `URL não indexada (${idx.verdict})`,
          message: `${idx.coverageState ?? "Estado desconhecido"} — ${url}`,
          details: idx as unknown as Record<string, unknown>,
        });
      }
      // Canonical mismatch
      if (idx.userCanonical && idx.googleCanonical && idx.userCanonical !== idx.googleCanonical) {
        out.push({
          alert_type: "canonical_mismatch",
          severity: "warning",
          url,
          title: "Canonical diferente do esperado",
          message: `Declarado: ${idx.userCanonical} · Google escolheu: ${idx.googleCanonical}`,
          details: { userCanonical: idx.userCanonical, googleCanonical: idx.googleCanonical },
        });
      }
      // Robots
      if (idx.robotsTxtState && idx.robotsTxtState !== "ALLOWED") {
        out.push({
          alert_type: "robots_blocked",
          severity: "critical",
          url,
          title: "Bloqueado por robots.txt",
          message: `${url} — ${idx.robotsTxtState}`,
          details: { robotsTxtState: idx.robotsTxtState },
        });
      }
      // Crawl error
      if (idx.pageFetchState && !["SUCCESSFUL", "PAGE_FETCH_STATE_UNSPECIFIED"].includes(idx.pageFetchState)) {
        out.push({
          alert_type: "crawl_error",
          severity: "critical",
          url,
          title: `Erro de rastreio (${idx.pageFetchState})`,
          message: `O Google falhou a obter ${url}.`,
          details: { pageFetchState: idx.pageFetchState },
        });
      }
    } catch (e) {
      console.error("inspect failed", url, e);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: aceita x-cron-secret OU JWT de super admin
  const cronSecret = Deno.env.get("GSC_CRON_SECRET") ?? Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  let authorized = !!(cronSecret && provided && provided === cronSecret);

  if (!authorized) {
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
      );
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: roleRow } = await sb.rpc("is_super_admin", { _user_id: user.id }).maybeSingle?.() as any
          ?? { data: null };
        // fallback: directly check user_roles
        const { data: rolesData } = await sb
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .limit(1);
        authorized = !!(roleRow === true || (rolesData && rolesData.length > 0));
      }
    } catch (_) { /* noop */ }
  }

  if (!authorized) return json({ error: "unauthorized" }, 401);

  try {
    const [smAlerts, urlAlerts] = await Promise.all([checkSitemaps(), checkUrls()]);
    const all = [...smAlerts, ...urlAlerts];

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    let upserts = 0;
    for (const a of all) {
      const fingerprint = fp(a);
      const { error } = await admin
        .from("gsc_alerts")
        .upsert(
          {
            alert_type: a.alert_type,
            severity: a.severity,
            site: SITE,
            url: a.url,
            title: a.title,
            message: a.message,
            details: a.details,
            fingerprint,
            status: "open",
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "fingerprint" },
        );
      if (!error) upserts++;
      else console.error("upsert gsc_alert", error);
    }

    return json({
      checked_at: new Date().toISOString(),
      sitemaps: smAlerts.length,
      urls: urlAlerts.length,
      total: all.length,
      persisted: upserts,
    });
  } catch (e) {
    console.error("gsc-cron-check-issues", e);
    return json({ fallback: true, error: e instanceof Error ? e.message : String(e) }, 200);
  }
});
