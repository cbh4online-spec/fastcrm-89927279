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
        const value = await calculateMetric(serviceClient, metric, workspace_id, now);
        const target = (targets || []).find((t: any) => t.metric_id === metric.id);

        // Get previous period value for comparison
        const prevValue = await calculateMetric(serviceClient, metric, workspace_id, getPreviousPeriodStart(now, target?.period || "monthly"));

        const pctOfTarget = target ? (value / target.target_value) * 100 : null;
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
          target_period: target?.period || null,
          previous_value: prevValue,
          pct_of_target: pctOfTarget ? Math.round(pctOfTarget * 10) / 10 : null,
          pct_change: pctChange ? Math.round(pctChange * 10) / 10 : null,
        });
      } catch (calcErr) {
        console.error(`Error calculating metric ${metric.name}:`, calcErr);
        results.push({
          metric_id: metric.id,
          metric_name: metric.name,
          metric_type: metric.metric_type,
          current_value: 0,
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

async function calculateMetric(client: any, metric: any, workspaceId: string, referenceDate: Date): Promise<number> {
  const table = metric.source_table;
  const formula = metric.formula;
  const field = metric.source_field;
  const filters = metric.filter_json || {};

  // Determine period boundaries
  const periodStart = getMonthStart(referenceDate);
  const periodEnd = getMonthEnd(referenceDate);

  let query = client.from(table).select("*", { count: "exact", head: formula === "count" || formula === "event_count" });

  // Apply workspace filter
  if (table !== "kernel_events") {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("workspace_id", workspaceId);
  }

  // Apply time filter
  query = query.gte("created_at", periodStart.toISOString()).lte("created_at", periodEnd.toISOString());

  // Apply custom filters
  if (filters.owner_id) query = query.eq("owner_user_id", filters.owner_id);
  if (filters.pipeline_id) query = query.eq("pipeline_id", filters.pipeline_id);
  if (filters.stage_id) query = query.eq("stage_id", filters.stage_id);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.status) query = query.eq("status", filters.status);

  if (formula === "count" || formula === "event_count") {
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  // For sum/avg/percentage/duration, fetch all records
  query = client.from(table).select(field || "*").eq("workspace_id", workspaceId)
    .gte("created_at", periodStart.toISOString()).lte("created_at", periodEnd.toISOString());

  if (filters.owner_id) query = query.eq("owner_user_id", filters.owner_id);
  if (filters.pipeline_id) query = query.eq("pipeline_id", filters.pipeline_id);
  if (filters.stage_id) query = query.eq("stage_id", filters.stage_id);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const values = data.map((r: any) => parseFloat(r[field] || 0)).filter((v: number) => !isNaN(v));

  switch (formula) {
    case "sum":
      return values.reduce((a: number, b: number) => a + b, 0);
    case "avg":
      return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    case "percentage":
      // percentage of records where field > 0
      return values.length > 0 ? (values.filter((v: number) => v > 0).length / values.length) * 100 : 0;
    case "duration":
      // average duration in days (field should be a timestamp diff)
      return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    default:
      return values.length;
  }
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

function getPreviousPeriodStart(date: Date, period: string): Date {
  const d = new Date(date);
  switch (period) {
    case "daily": d.setDate(d.getDate() - 1); break;
    case "weekly": d.setDate(d.getDate() - 7); break;
    case "monthly": d.setMonth(d.getMonth() - 1); break;
    case "quarterly": d.setMonth(d.getMonth() - 3); break;
    case "annual": d.setFullYear(d.getFullYear() - 1); break;
    default: d.setMonth(d.getMonth() - 1);
  }
  return d;
}
