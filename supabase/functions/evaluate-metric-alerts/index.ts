import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const client = createClient(supabaseUrl, serviceKey);

    // Optional: workspace_id filter, otherwise evaluate all
    let workspaceFilter: string | null = null;
    try {
      const body = await req.json();
      workspaceFilter = body.workspace_id || null;
    } catch { /* no body = evaluate all */ }

    // Fetch active alerts with their metrics
    let alertsQuery = client
      .from("pipeline_metric_alerts")
      .select("*, pipeline_metrics!inner(id, name, workspace_id, source_table, formula, source_field, filter_json, unit, metric_type)")
      .eq("is_active", true);

    if (workspaceFilter) {
      alertsQuery = alertsQuery.eq("workspace_id", workspaceFilter);
    }

    const { data: alerts, error: alertsErr } = await alertsQuery;
    if (alertsErr) throw alertsErr;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ evaluated: 0, triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch targets for referenced metrics
    const metricIds = [...new Set(alerts.map((a: any) => a.metric_id))];
    const { data: targets } = await client
      .from("pipeline_metric_targets")
      .select("*")
      .in("metric_id", metricIds)
      .eq("is_active", true);

    const now = new Date();
    let triggered = 0;

    for (const alert of alerts) {
      try {
        const metric = (alert as any).pipeline_metrics;
        const target = (targets || []).find((t: any) => t.metric_id === alert.metric_id);
        const period = target?.period || "monthly";
        const workspaceId = metric.workspace_id;

        const { start, end } = getPeriodBounds(now, period);
        const currentValue = await calculateMetric(client, metric, workspaceId, start, end);

        const { start: prevStart, end: prevEnd } = getPreviousPeriodBounds(now, period);
        const prevValue = await calculateMetric(client, metric, workspaceId, prevStart, prevEnd);

        const targetValue = target?.target_value;
        const pctOfTarget = targetValue && targetValue > 0 ? (currentValue / targetValue) * 100 : null;
        const pctChange = prevValue > 0 ? ((currentValue - prevValue) / prevValue) * 100 : null;

        const shouldTrigger = evaluateCondition(
          alert.condition,
          alert.threshold_pct,
          pctOfTarget,
          pctChange,
          currentValue,
          targetValue
        );

        if (shouldTrigger) {
          // Cooldown: don't fire same alert more than once per hour
          if (alert.last_triggered_at) {
            const lastFired = new Date(alert.last_triggered_at);
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            if (lastFired > hourAgo) continue;
          }

          const notifTitle = buildNotificationTitle(alert.condition, metric.name, pctOfTarget, pctChange);
          const notifBody = buildNotificationBody(alert.condition, metric.name, currentValue, targetValue, metric.unit, pctChange);

          // In-app notification
          if (alert.channel === "in_app" || alert.channel === "email") {
            await client.from("notifications").insert({
              workspace_id: workspaceId,
              title: notifTitle,
              message: notifBody,
              type: "metric_alert",
              metadata: {
                metric_id: alert.metric_id,
                alert_id: alert.id,
                condition: alert.condition,
                current_value: currentValue,
                target_value: targetValue,
                pct_of_target: pctOfTarget,
              },
            });
          }

          // Webhook
          if (alert.channel === "webhook" && alert.webhook_url) {
            try {
              await fetch(alert.webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: "metric_alert_triggered",
                  alert_id: alert.id,
                  metric_id: alert.metric_id,
                  metric_name: metric.name,
                  condition: alert.condition,
                  threshold_pct: alert.threshold_pct,
                  current_value: currentValue,
                  target_value: targetValue,
                  pct_of_target: pctOfTarget,
                  pct_change: pctChange,
                  workspace_id: workspaceId,
                  triggered_at: now.toISOString(),
                }),
              });
            } catch (webhookErr) {
              console.error("Webhook failed:", webhookErr);
            }
          }

          // Update last_triggered_at
          await client
            .from("pipeline_metric_alerts")
            .update({ last_triggered_at: now.toISOString() })
            .eq("id", alert.id);

          // Save snapshot
          await client.from("pipeline_metric_snapshots").insert({
            metric_id: alert.metric_id,
            period,
            period_start: start.toISOString(),
            period_end: end.toISOString(),
            current_value: currentValue,
            target_value: targetValue || null,
            previous_value: prevValue || null,
            pct_of_target: pctOfTarget ? Math.round(pctOfTarget * 10) / 10 : null,
            pct_change: pctChange ? Math.round(pctChange * 10) / 10 : null,
            breakdown_json: { alert_triggered: true, condition: alert.condition },
          });

          triggered++;
        }
      } catch (evalErr) {
        console.error(`Alert ${alert.id} evaluation error:`, evalErr);
      }
    }

    return new Response(
      JSON.stringify({ evaluated: alerts.length, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function evaluateCondition(
  condition: string,
  thresholdPct: number,
  pctOfTarget: number | null,
  pctChange: number | null,
  currentValue: number,
  targetValue: number | null
): boolean {
  switch (condition) {
    case "below_target":
      return pctOfTarget !== null && pctOfTarget < thresholdPct;
    case "above_target":
      return pctOfTarget !== null && pctOfTarget > thresholdPct;
    case "sla_breach":
      return targetValue !== null && currentValue > targetValue;
    case "trend_down":
      return pctChange !== null && pctChange < -thresholdPct;
    default:
      return false;
  }
}

function buildNotificationTitle(condition: string, metricName: string, pctOfTarget: number | null, pctChange: number | null): string {
  switch (condition) {
    case "below_target":
      return `⚠️ ${metricName} abaixo da meta (${pctOfTarget?.toFixed(0)}%)`;
    case "above_target":
      return `🎯 ${metricName} acima da meta (${pctOfTarget?.toFixed(0)}%)`;
    case "sla_breach":
      return `🚨 ${metricName} — violação de SLA`;
    case "trend_down":
      return `📉 ${metricName} em queda (${pctChange?.toFixed(0)}%)`;
    default:
      return `Alerta: ${metricName}`;
  }
}

function buildNotificationBody(condition: string, name: string, current: number, target: number | null, unit: string, pctChange: number | null): string {
  const val = unit === "€" ? `€${current.toLocaleString()}` : unit === "%" ? `${current.toFixed(1)}%` : `${current}`;
  const tgt = target ? (unit === "€" ? `€${target.toLocaleString()}` : `${target}`) : null;
  
  switch (condition) {
    case "below_target":
      return `${name} está em ${val}${tgt ? ` (meta: ${tgt}${unit && !["€","%"].includes(unit) ? ` ${unit}` : ""})` : ""}`;
    case "above_target":
      return `${name} atingiu ${val}${tgt ? ` — meta era ${tgt}` : ""}`;
    case "sla_breach":
      return `${name}: valor actual ${val} excede o limite${tgt ? ` de ${tgt}` : ""}`;
    case "trend_down":
      return `${name} caiu ${Math.abs(pctChange || 0).toFixed(1)}% em relação ao período anterior (actual: ${val})`;
    default:
      return `${name}: ${val}`;
  }
}

// --- Calculation helpers (same as calculate-pipeline-metrics) ---

async function calculateMetric(client: any, metric: any, workspaceId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  const table = metric.source_table;
  const formula = metric.formula;
  const field = metric.source_field;
  const filters = metric.filter_json || {};

  if (formula === "count" || formula === "event_count") {
    let query = client.from(table).select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());
    query = applyFilters(query, filters, table);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  const selectField = field || "*";
  let query = client.from(table).select(selectField)
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString());
  query = applyFilters(query, filters, table);
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const values = data.map((r: any) => parseFloat(r[field] || 0)).filter((v: number) => !isNaN(v));
  switch (formula) {
    case "sum": return values.reduce((a: number, b: number) => a + b, 0);
    case "avg": return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    case "percentage": return values.length > 0 ? (values.filter((v: number) => v > 0).length / values.length) * 100 : 0;
    case "duration": return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    default: return values.length;
  }
}

function applyFilters(query: any, filters: Record<string, any>, table: string): any {
  if (filters.owner_id) query = query.eq("owner_user_id", filters.owner_id);
  if (filters.pipeline_id) query = query.eq("pipeline_id", filters.pipeline_id);
  if (filters.stage_id) query = query.eq("stage_id", filters.stage_id);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.channel) query = query.eq("channel", filters.channel);
  if (filters.event_type && table === "kernel_events") query = query.eq("type", filters.event_type);
  return query;
}

function getPeriodBounds(date: Date, period: string): { start: Date; end: Date } {
  const d = new Date(date);
  switch (period) {
    case "daily":
      return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) };
    case "weekly": {
      const day = d.getDay(); const diff = day === 0 ? 6 : day - 1;
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
      const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "monthly":
      return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999) };
    case "quarterly": {
      const q = Math.floor(d.getMonth() / 3);
      return { start: new Date(d.getFullYear(), q * 3, 1), end: new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999) };
    }
    case "annual":
      return { start: new Date(d.getFullYear(), 0, 1), end: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999) };
    default:
      return getPeriodBounds(date, "monthly");
  }
}

function getPreviousPeriodBounds(date: Date, period: string): { start: Date; end: Date } {
  const d = new Date(date);
  switch (period) {
    case "daily": d.setDate(d.getDate() - 1); return getPeriodBounds(d, "daily");
    case "weekly": d.setDate(d.getDate() - 7); return getPeriodBounds(d, "weekly");
    case "monthly": d.setMonth(d.getMonth() - 1); return getPeriodBounds(d, "monthly");
    case "quarterly": d.setMonth(d.getMonth() - 3); return getPeriodBounds(d, "quarterly");
    case "annual": d.setFullYear(d.getFullYear() - 1); return getPeriodBounds(d, "annual");
    default: d.setMonth(d.getMonth() - 1); return getPeriodBounds(d, "monthly");
  }
}
