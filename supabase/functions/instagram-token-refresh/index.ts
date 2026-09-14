import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * instagram-token-refresh — renova os tokens de longa duração do Instagram.
 *
 * Os tokens do Instagram (ig_exchange_token) expiram em 60 dias e só podem ser
 * renovados enquanto estiverem válidos. Esta função corre por cron e renova
 * qualquer ligação cuja expiração esteja a menos de 14 dias.
 *
 * Autenticação: header x-cron-secret (CRON_SECRET). Fail-closed.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const REFRESH_WINDOW_DAYS = 14;

interface RefreshOutcome {
  source: "meta_connections" | "instagram_connections";
  id: string;
  workspace_id: string | null;
  status: "refreshed" | "failed" | "skipped";
  reason?: string;
  expires_at?: string;
}

async function refreshToken(token: string): Promise<{ ok: true; token: string; expiresIn: number } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
    );
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `[${res.status}]: ${text.slice(0, 300)}` };
    const data = JSON.parse(text);
    if (!data?.access_token) return { ok: false, error: "resposta sem access_token" };
    return { ok: true, token: data.access_token, expiresIn: Number(data.expires_in) || 5184000 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Autenticação fail-closed: CRON_SECRET (env) ou o segredo dedicado em _cron_config.
  const provided = req.headers.get("x-cron-secret");
  const envSecret = Deno.env.get("CRON_SECRET");
  let authorized = !!provided && !!envSecret && provided === envSecret;
  if (!authorized && provided) {
    const { data: cfg } = await supabase
      .from("_cron_config")
      .select("value")
      .eq("key", "instagram_token_refresh_cron_secret")
      .maybeSingle();
    authorized = !!cfg?.value && cfg.value === provided;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const threshold = new Date(now + REFRESH_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const results: RefreshOutcome[] = [];

  try {
    // 1. meta_connections (fluxo OAuth atual)
    const { data: metaRows, error: metaError } = await supabase
      .from("meta_connections")
      .select("id, workspace_id, encrypted_access_token, expires_at")
      .eq("provider", "instagram")
      .eq("status", "active")
      .lte("expires_at", threshold);

    if (metaError) console.error("[instagram-token-refresh] meta_connections:", metaError.message);

    for (const row of metaRows ?? []) {
      if (!row.encrypted_access_token) {
        results.push({ source: "meta_connections", id: row.id, workspace_id: row.workspace_id, status: "skipped", reason: "sem token" });
        continue;
      }
      if (row.expires_at && new Date(row.expires_at).getTime() <= now) {
        await supabase
          .from("meta_connections")
          .update({ health_status: "expired", last_healthcheck_at: new Date().toISOString() })
          .eq("id", row.id);
        results.push({ source: "meta_connections", id: row.id, workspace_id: row.workspace_id, status: "failed", reason: "token já expirado — é necessário ligar de novo" });
        continue;
      }

      const refreshed = await refreshToken(row.encrypted_access_token);
      if (!refreshed.ok) {
        await supabase
          .from("meta_connections")
          .update({ health_status: "degraded", last_healthcheck_at: new Date().toISOString() })
          .eq("id", row.id);
        results.push({ source: "meta_connections", id: row.id, workspace_id: row.workspace_id, status: "failed", reason: refreshed.error });
        continue;
      }

      const expiresAt = new Date(now + refreshed.expiresIn * 1000).toISOString();
      await supabase
        .from("meta_connections")
        .update({
          encrypted_access_token: refreshed.token,
          expires_at: expiresAt,
          health_status: "healthy",
          last_healthcheck_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      // Espelha nas ligações usadas pelo Inbox.
      await supabase
        .from("instagram_connections")
        .update({ access_token: refreshed.token, token_expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("workspace_id", row.workspace_id);

      results.push({ source: "meta_connections", id: row.id, workspace_id: row.workspace_id, status: "refreshed", expires_at: expiresAt });
    }

    // 2. instagram_connections sem par em meta_connections (ligações antigas)
    const { data: igRows, error: igError } = await supabase
      .from("instagram_connections")
      .select("id, workspace_id, access_token, token_expires_at")
      .eq("is_active", true)
      .lte("token_expires_at", threshold);

    if (igError) console.error("[instagram-token-refresh] instagram_connections:", igError.message);

    const handled = new Set(results.filter((r) => r.workspace_id).map((r) => r.workspace_id));

    for (const row of igRows ?? []) {
      if (handled.has(row.workspace_id)) continue;
      if (!row.access_token) {
        results.push({ source: "instagram_connections", id: row.id, workspace_id: row.workspace_id, status: "skipped", reason: "sem token" });
        continue;
      }
      if (row.token_expires_at && new Date(row.token_expires_at).getTime() <= now) {
        results.push({ source: "instagram_connections", id: row.id, workspace_id: row.workspace_id, status: "failed", reason: "token já expirado — é necessário ligar de novo" });
        continue;
      }

      const refreshed = await refreshToken(row.access_token);
      if (!refreshed.ok) {
        results.push({ source: "instagram_connections", id: row.id, workspace_id: row.workspace_id, status: "failed", reason: refreshed.error });
        continue;
      }

      const expiresAt = new Date(now + refreshed.expiresIn * 1000).toISOString();
      await supabase
        .from("instagram_connections")
        .update({ access_token: refreshed.token, token_expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      results.push({ source: "instagram_connections", id: row.id, workspace_id: row.workspace_id, status: "refreshed", expires_at: expiresAt });
    }

    const summary = {
      checked: results.length,
      refreshed: results.filter((r) => r.status === "refreshed").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    };
    console.log("[instagram-token-refresh]", JSON.stringify(summary));

    return new Response(JSON.stringify({ success: true, ...summary, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[instagram-token-refresh] erro inesperado:", message);
    return new Response(JSON.stringify({ success: false, error: "internal_error", details: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
