import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];
    const dayStart = `${today}T00:00:00Z`;
    const dayEnd = `${today}T23:59:59Z`;

    // Commands executed today (from event log)
    const { count: commandsCount } = await supabase
      .from("context_event_log")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("event_type", "command.executed")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    // Alerts generated today
    const { count: alertsGenerated } = await supabase
      .from("context_alerts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    // Alerts resolved today
    const { count: alertsResolved } = await supabase
      .from("context_alerts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("status", "resolved")
      .gte("updated_at", dayStart)
      .lte("updated_at", dayEnd);

    // Tasks created by system today
    const { count: tasksCreated } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("related_type", "context_block")
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    // Tasks completed today
    const { count: tasksCompleted } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("status", "completed")
      .gte("updated_at", dayStart)
      .lte("updated_at", dayEnd);

    // Drift severity counts
    const { data: driftData } = await supabase
      .from("context_drift")
      .select("severity")
      .eq("workspace_id", workspace_id);

    let warn = 0, risk = 0, critical = 0;
    for (const d of driftData ?? []) {
      if (d.severity === "warn") warn++;
      else if (d.severity === "risk") risk++;
      else if (d.severity === "critical") critical++;
    }

    // Overdue tasks
    const { count: overdueTasks } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("related_type", "context_block")
      .in("status", ["open", "in_progress"])
      .lt("due_date", new Date().toISOString());

    const healthScore = clamp(
      100 - (critical * 5) - (risk * 2) - ((overdueTasks ?? 0) * 1),
      0,
      100
    );

    // Upsert
    const { error } = await supabase
      .from("system_metrics_daily")
      .upsert({
        workspace_id,
        metric_date: today,
        commands_executed: commandsCount ?? 0,
        alerts_generated: alertsGenerated ?? 0,
        alerts_resolved: alertsResolved ?? 0,
        tasks_created_system: tasksCreated ?? 0,
        tasks_completed: tasksCompleted ?? 0,
        drift_blocks_warn: warn,
        drift_blocks_risk: risk,
        drift_blocks_critical: critical,
        health_score: healthScore,
      }, { onConflict: "workspace_id,metric_date" });

    if (error) throw error;

    return new Response(
      JSON.stringify({ health_score: healthScore, warn, risk, critical }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
