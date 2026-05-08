// GHL Routing Alerts — monitors ghl_routing_audit for spikes of
// skipped_wrong_workspace / no_account_id_with_siblings_fail_closed
// and emits admin_notifications + system_health_diagnostics entries.
//
// Designed to be triggered by pg_cron every 10 minutes.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

// Tunables
const WINDOW_MINUTES = 15;
const THRESHOLD_SKIPPED = 20; // skipped_wrong_workspace / window
const THRESHOLD_NO_ACCOUNT = 10; // no_account_id_with_siblings_fail_closed / window
const COOLDOWN_MINUTES = 60; // suppress duplicate alerts per (workspace,reason)

interface CountRow {
  workspace_id: string | null;
  reason: string;
  cnt: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const cooldownSince = new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString();

  try {
    // Pull recent skip events
    const { data: rows, error } = await supabase
      .from("ghl_routing_audit")
      .select("source_workspace_id, reason")
      .eq("action", "skipped")
      .in("reason", [
        "skipped_wrong_workspace",
        "account_id_owned_by_other_workspace",
        "no_account_id_with_siblings_fail_closed",
      ])
      .gte("created_at", since)
      .limit(5000);

    if (error) throw error;

    // Aggregate
    const counts = new Map<string, CountRow>();
    for (const r of rows ?? []) {
      const wsId = (r as any).source_workspace_id ?? "unknown";
      const reason = (r as any).reason as string;
      const key = `${wsId}::${reason}`;
      const existing = counts.get(key);
      if (existing) existing.cnt++;
      else counts.set(key, { workspace_id: wsId, reason, cnt: 1 });
    }

    const alerts: Array<{ workspace_id: string; reason: string; count: number; severity: string }> = [];

    for (const c of counts.values()) {
      let threshold = THRESHOLD_SKIPPED;
      let severity = "warning";
      if (c.reason === "no_account_id_with_siblings_fail_closed") {
        threshold = THRESHOLD_NO_ACCOUNT;
        severity = "critical";
      }
      if (c.cnt < threshold) continue;
      if (!c.workspace_id || c.workspace_id === "unknown") continue;

      // Cooldown: skip if same alert exists recently
      const { count: existingCount } = await supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", c.workspace_id)
        .eq("type", "ghl_routing_spike")
        .gte("created_at", cooldownSince)
        .like("title", `%${c.reason}%`);

      if ((existingCount ?? 0) > 0) continue;

      const title = `GHL routing spike: ${c.reason}`;
      const message = `${c.cnt} eventos "${c.reason}" nos últimos ${WINDOW_MINUTES} min (limite: ${threshold}). Verifique configuração de canais GHL para evitar contaminação entre workspaces.`;

      await supabase.from("admin_notifications").insert({
        workspace_id: c.workspace_id,
        type: "ghl_routing_spike",
        title,
        message,
        metadata: {
          reason: c.reason,
          count: c.cnt,
          window_minutes: WINDOW_MINUTES,
          threshold,
          severity,
          source: "ghl-routing-alerts",
        },
      } as any);

      // Also try to log to system_health_diagnostics (best effort)
      try {
        await supabase.from("system_health_diagnostics").insert({
          workspace_id: c.workspace_id,
          component: "ghl-routing",
          status: severity === "critical" ? "critical" : "degraded",
          message: title,
          metadata: { reason: c.reason, count: c.cnt, window_minutes: WINDOW_MINUTES },
        } as any);
      } catch (_) { /* table may not exist, ignore */ }

      alerts.push({ workspace_id: c.workspace_id, reason: c.reason, count: c.cnt, severity });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        window_minutes: WINDOW_MINUTES,
        events_examined: rows?.length ?? 0,
        alerts_emitted: alerts.length,
        alerts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("[ghl-routing-alerts] error", e);
    return new Response(
      JSON.stringify({ ok: false, fallback: true, error: (e as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
