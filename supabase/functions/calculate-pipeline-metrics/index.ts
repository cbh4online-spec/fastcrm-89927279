import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { workspace_id, metric_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    // Verify workspace membership
    const { data: member } = await supabaseClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperAdmin = user.user_metadata?.is_super_admin || user.app_metadata?.is_super_admin;
    if (!member && !isSuperAdmin) throw new Error("Access denied");

    // Use service role for queries
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch metrics
    let metricsQuery = serviceClient.from("pipeline_metrics").select("*").eq("workspace_id", workspace_id).eq("is_active", true);
    if (metric_id) metricsQuery = metricsQuery.eq("id", metric_id);
    const { data: metrics, error: metricsError } = await metricsQuery;
    if (metricsError) throw metricsError;

    // Fetch targets
    const { data: targets } = await serviceClient.from("pipeline_metric_targets").select("*").eq("workspace_id", workspace_id).eq("is_active", true);

    const now = new Date();
    const results = [];

    for (const metric of metrics || []) {
      try {
        const target = (targets || []).find((t: any) => t.metric_id === metric.id);
        const period = target?.period || "monthly";

        // Get current period boundaries
        const { start: periodStart, end: periodEnd } = getPeriodBounds(now, period);
        const value = await calculateMetric(serviceClient, metric, workspace_id, periodStart, periodEnd);

        // Get previous period for comparison
        const { start: prevStart, end: prevEnd } = getPreviousPeriodBounds(now, period);
        const prevValue = await calculateMetric(serviceClient, metric, workspace_id, prevStart, prevEnd);

        const pctOfTarget = target ? (target.target_value > 0 ? (value / target.target_value) * 100 : 0) : null;
        const pctChange = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null;

        results.push({
          metric_id: metric.id,
          metric_name: metric.name,
          metric_type: metric.metric_type,
          formula: metric.formula,
          unit: metric.unit,
          icon: metric.icon,
          color: metric.color,
          current_value: value,
          target_value: target?.target_value || null,
          target_period: period,
          previous_value: prevValue,
          pct_of_target: pctOfTarget !== null ? Math.round(pctOfTarget * 10) / 10 : null,
          pct_change: pctChange !== null ? Math.round(pctChange * 10) / 10 : null,
        });
      } catch (calcErr) {
        console.error(`Error calculating metric ${metric.name}:`, calcErr);
        results.push({
          metric_id: metric.id,
          metric_name: metric.name,
          metric_type: metric.metric_type,
          current_value: 0,
          target_value: null,
          target_period: null,
          previous_value: null,
          pct_of_target: null,
          pct_change: null,
          error: calcErr instanceof Error ? calcErr.message : "Calculation error",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes("authenticated") || msg.includes("Access") ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function calculateMetric(
  client: any,
  metric: any,
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const table = metric.source_table;
  const formula = metric.formula;
  const field = metric.source_field;
  const filters = metric.filter_json || {};

  // For count-based formulas, use head mode
  if (formula === "count" || formula === "event_count") {
    let query = client
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString());

    query = applyFilters(query, filters, table);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  // For aggregation formulas, fetch data
  const selectField = field || "*";
  let query = client
    .from(table)
    .select(selectField)
    .eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString());

  query = applyFilters(query, filters, table);
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const values = data
    .map((r: any) => parseFloat(r[field] || 0))
    .filter((v: number) => !isNaN(v));

  switch (formula) {
    case "sum":
      return values.reduce((a: number, b: number) => a + b, 0);
    case "avg":
      return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    case "percentage":
      return values.length > 0 ? (values.filter((v: number) => v > 0).length / values.length) * 100 : 0;
    case "duration":
      return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    default:
      return values.length;
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
  if (filters.entity_kind && table === "kernel_events") query = query.eq("entity_kind", filters.entity_kind);
  return query;
}

// ---- Period boundary helpers ----

function getPeriodBounds(date: Date, period: string): { start: Date; end: Date } {
  const d = new Date(date);
  switch (period) {
    case "daily":
      return {
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      };
    case "weekly": {
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "monthly":
      return {
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    case "quarterly": {
      const q = Math.floor(d.getMonth() / 3);
      return {
        start: new Date(d.getFullYear(), q * 3, 1),
        end: new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999),
      };
    }
    case "annual":
      return {
        start: new Date(d.getFullYear(), 0, 1),
        end: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    default:
      return getPeriodBounds(date, "monthly");
  }
}

function getPreviousPeriodBounds(date: Date, period: string): { start: Date; end: Date } {
  const d = new Date(date);
  switch (period) {
    case "daily":
      d.setDate(d.getDate() - 1);
      return getPeriodBounds(d, "daily");
    case "weekly":
      d.setDate(d.getDate() - 7);
      return getPeriodBounds(d, "weekly");
    case "monthly":
      d.setMonth(d.getMonth() - 1);
      return getPeriodBounds(d, "monthly");
    case "quarterly":
      d.setMonth(d.getMonth() - 3);
      return getPeriodBounds(d, "quarterly");
    case "annual":
      d.setFullYear(d.getFullYear() - 1);
      return getPeriodBounds(d, "annual");
    default:
      d.setMonth(d.getMonth() - 1);
      return getPeriodBounds(d, "monthly");
  }
}
