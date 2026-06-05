import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const { data: cfg } = await supabase
      .from("_cron_config").select("value").eq("key", "email_fetch_cron_secret").maybeSingle();
    if (!cfg?.value || cfg.value !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Select due connections: never synced or last sync >5 min ago, not currently syncing (or stuck syncing for >10 min)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: conns, error: connsErr } = await supabase
      .from("email_connections")
      .select("id, workspace_id, email_address, sync_status, last_sync_at")
      .eq("is_active", true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${cutoff}`)
      .order("last_sync_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (connsErr) throw connsErr;

    const due = (conns ?? []).filter((c) => {
      if (c.sync_status !== "syncing") return true;
      // include stuck-syncing too
      return !c.last_sync_at || c.last_sync_at < stuckCutoff;
    });

    const results: Array<{ id: string; email: string; ok: boolean; error?: string; skipped?: string }> = [];

    // Process in small batches to avoid hammering edge runtime
    const BATCH = 3;
    for (let i = 0; i < due.length; i += BATCH) {
      const batch = due.slice(i, i + BATCH);
      const settled = await Promise.allSettled(
        batch.map(async (c) => {
          const res = await fetch(`${supabaseUrl}/functions/v1/email-fetch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": cronSecret,
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              connectionId: c.id,
              workspaceId: c.workspace_id,
              source: "cron",
            }),
          });
          const text = await res.text();
          let parsed: any = null;
          try { parsed = JSON.parse(text); } catch { /* ignore */ }
          return { connection: c, status: res.status, parsed, text };
        })
      );

      for (let k = 0; k < settled.length; k++) {
        const r = settled[k];
        const c = batch[k];
        if (r.status === "fulfilled") {
          const { status, parsed } = r.value;
          if (parsed?.skipped) {
            results.push({ id: c.id, email: c.email_address, ok: true, skipped: parsed.skipped });
          } else if (status >= 200 && status < 300 && !parsed?.error) {
            results.push({ id: c.id, email: c.email_address, ok: true });
          } else {
            results.push({ id: c.id, email: c.email_address, ok: false, error: parsed?.error || `HTTP ${status}` });
          }
        } else {
          results.push({ id: c.id, email: c.email_address, ok: false, error: String(r.reason) });
        }
      }
    }

    const ok = results.filter((r) => r.ok).length;
    const failed = results.length - ok;

    console.log(`[email-fetch-scheduler] processed=${results.length} ok=${ok} failed=${failed}`);

    return new Response(
      JSON.stringify({ processed: results.length, ok, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[email-fetch-scheduler] error:", message);
    return new Response(JSON.stringify({ error: message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
