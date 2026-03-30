import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check settings
    const { data: settings } = await supabase
      .from("agent_ops_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!settings?.is_enabled || !settings?.supervisor_enabled) {
      return new Response(
        JSON.stringify({ checked: false, reason: "supervisor_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get active bots
    const { data: bots } = await supabase
      .from("bots")
      .select("id, name, role, status")
      .eq("workspace_id", workspace_id)
      .eq("status", "active");

    if (!bots || bots.length === 0) {
      return new Response(
        JSON.stringify({ checked: true, alerts: [], message: "no_active_bots" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botIds = bots.map((b: any) => b.id);
    const maxItems = settings.max_open_items_per_agent || 10;

    // Get all work items for active bots (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: workItems } = await supabase
      .from("agent_work_items")
      .select("id, bot_id, status, created_at, completed_at, failed_at, assigned_at")
      .eq("workspace_id", workspace_id)
      .in("bot_id", botIds)
      .gte("created_at", sevenDaysAgo.toISOString());

    // Compute per-bot metrics
    const botMetrics: Record<string, {
      total: number;
      completed: number;
      failed: number;
      open: number;
      avgCompletionMs: number;
      completionTimes: number[];
    }> = {};

    for (const bot of bots) {
      botMetrics[bot.id] = { total: 0, completed: 0, failed: 0, open: 0, avgCompletionMs: 0, completionTimes: [] };
    }

    for (const wi of workItems || []) {
      if (!wi.bot_id || !botMetrics[wi.bot_id]) continue;
      const m = botMetrics[wi.bot_id];
      m.total++;

      if (wi.status === "completed") {
        m.completed++;
        if (wi.assigned_at && wi.completed_at) {
          const ms = new Date(wi.completed_at).getTime() - new Date(wi.assigned_at).getTime();
          if (ms > 0) m.completionTimes.push(ms);
        }
      } else if (wi.status === "failed") {
        m.failed++;
      } else if (["pending", "assigned", "in_progress"].includes(wi.status)) {
        m.open++;
      }
    }

    // Compute averages + generate alerts
    const alerts: Array<{
      bot_id: string;
      bot_name: string;
      alert_type: string;
      severity: string;
      message: string;
      metrics: Record<string, number>;
    }> = [];

    const redistCandidates: Array<{ bot_id: string; open: number }> = [];
    const underloadedBots: Array<{ bot_id: string; open: number }> = [];

    for (const bot of bots) {
      const m = botMetrics[bot.id];
      if (m.completionTimes.length > 0) {
        m.avgCompletionMs = m.completionTimes.reduce((a: number, b: number) => a + b, 0) / m.completionTimes.length;
      }

      const successRate = m.total > 0 ? (m.completed / m.total) * 100 : 100;
      const failureRate = m.total > 0 ? (m.failed / m.total) * 100 : 0;

      // High failure rate (>40%)
      if (m.total >= 3 && failureRate > 40) {
        alerts.push({
          bot_id: bot.id,
          bot_name: bot.name,
          alert_type: "high_failure_rate",
          severity: "high",
          message: `Agente "${bot.name}" tem taxa de falha de ${failureRate.toFixed(0)}% (${m.failed}/${m.total})`,
          metrics: { failure_rate: failureRate, total: m.total, failed: m.failed },
        });
      }

      // Overloaded (>= max capacity)
      if (m.open >= maxItems) {
        alerts.push({
          bot_id: bot.id,
          bot_name: bot.name,
          alert_type: "capacity_exceeded",
          severity: "medium",
          message: `Agente "${bot.name}" tem ${m.open} items abertos (máx: ${maxItems})`,
          metrics: { open_items: m.open, max_items: maxItems },
        });
        redistCandidates.push({ bot_id: bot.id, open: m.open });
      }

      // Low throughput (0 completed in 7 days with items assigned)
      if (m.total >= 3 && m.completed === 0) {
        alerts.push({
          bot_id: bot.id,
          bot_name: bot.name,
          alert_type: "low_throughput",
          severity: "medium",
          message: `Agente "${bot.name}" não completou nenhum item nos últimos 7 dias (${m.total} atribuídos)`,
          metrics: { total: m.total, completed: 0 },
        });
      }

      if (m.open < maxItems * 0.5) {
        underloadedBots.push({ bot_id: bot.id, open: m.open });
      }
    }

    // Redistribute: move pending items from overloaded to underloaded bots
    let redistributed = 0;
    if (redistCandidates.length > 0 && underloadedBots.length > 0) {
      for (const overloaded of redistCandidates) {
        const { data: pendingItems } = await supabase
          .from("agent_work_items")
          .select("id")
          .eq("bot_id", overloaded.bot_id)
          .eq("status", "pending")
          .limit(3);

        if (!pendingItems || pendingItems.length === 0) continue;

        for (const item of pendingItems) {
          const target = underloadedBots[redistributed % underloadedBots.length];
          if (!target) break;

          await supabase
            .from("agent_work_items")
            .update({
              bot_id: target.bot_id,
              assigned_at: new Date().toISOString(),
              routed_by: "supervisor",
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          redistributed++;
        }
      }
    }

    // Emit supervisor alert events
    for (const alert of alerts) {
      await supabase.functions.invoke("kernel-ingest-event", {
        body: {
          workspace_id,
          type: "AGENT.SUPERVISOR_ALERT",
          entity_kind: "bot",
          entity_id: alert.bot_id,
          actor_type: "system",
          source_module: "supervisor-agent-check",
          payload: {
            alert_type: alert.alert_type,
            severity: alert.severity,
            message: alert.message,
            metrics: alert.metrics,
          },
          schema_version: 1,
          occurred_at: new Date().toISOString(),
        },
      });
    }

    console.log(`[SUPERVISOR] workspace=${workspace_id} alerts=${alerts.length} redistributed=${redistributed}`);

    return new Response(
      JSON.stringify({
        checked: true,
        alerts,
        redistributed,
        bot_count: bots.length,
        bot_metrics: Object.fromEntries(
          bots.map((b: any) => [b.id, {
            name: b.name,
            role: b.role,
            total: botMetrics[b.id].total,
            completed: botMetrics[b.id].completed,
            failed: botMetrics[b.id].failed,
            open: botMetrics[b.id].open,
            success_rate: botMetrics[b.id].total > 0 ? ((botMetrics[b.id].completed / botMetrics[b.id].total) * 100).toFixed(1) : "N/A",
            avg_completion_hours: botMetrics[b.id].avgCompletionMs > 0 ? (botMetrics[b.id].avgCompletionMs / 3600000).toFixed(1) : "N/A",
          }])
        ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[SUPERVISOR] Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
