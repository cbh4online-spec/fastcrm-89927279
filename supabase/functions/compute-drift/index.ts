import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLA_DAYS: Record<string, number> = {
  offer: 7, funnel: 14, script: 21, template: 30,
  automation: 21, kpi: 7, brief: 7, sop: 30,
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function severityFromScore(score: number): string {
  if (score < 15) return "ok";
  if (score < 40) return "warn";
  if (score < 70) return "risk";
  return "critical";
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

    // Fetch all active blocks
    const { data: blocks, error: bErr } = await supabase
      .from("context_blocks")
      .select("id, block_type, last_verified_at, last_changed_at, created_at")
      .eq("workspace_id", workspace_id)
      .eq("status", "active");
    if (bErr) throw bErr;
    if (!blocks?.length) return new Response(JSON.stringify({ computed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch dependencies
    const { data: deps } = await supabase
      .from("context_dependencies")
      .select("source_block_id, target_block_id, strength")
      .eq("workspace_id", workspace_id);

    // Fetch open tasks related to context blocks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("related_id")
      .eq("workspace_id", workspace_id)
      .eq("related_type", "context_block")
      .in("status", ["open", "in_progress"]);

    const taskCounts: Record<string, number> = {};
    for (const t of tasks ?? []) {
      taskCounts[t.related_id] = (taskCounts[t.related_id] ?? 0) + 1;
    }

    // Find recently changed blocks (last 14 days)
    const recentCutoff = new Date(Date.now() - 14 * 86400000).toISOString();
    const recentlyChanged = new Set(
      (blocks ?? [])
        .filter((b: { last_changed_at?: string }) => b.last_changed_at && b.last_changed_at > recentCutoff)
        .map((b: { id: string }) => b.id)
    );

    const results = [];
    const alertsToCreate = [];

    // Fetch existing drift to detect threshold crossings
    const { data: existingDrift } = await supabase
      .from("context_drift")
      .select("block_id, severity")
      .eq("workspace_id", workspace_id);
    const prevSeverity: Record<string, string> = {};
    for (const d of existingDrift ?? []) {
      prevSeverity[d.block_id] = d.severity;
    }

    for (const block of blocks) {
      const sla = SLA_DAYS[block.block_type] ?? 14;
      const verifiedAt = block.last_verified_at ?? block.created_at;
      const staleDays = Math.floor((Date.now() - new Date(verifiedAt).getTime()) / 86400000);
      const timeComponent = clamp((staleDays / sla) * 60, 0, 60);

      // Dependency impact: sum strengths of deps where source recently changed and target = this block
      let depImpactRaw = 0;
      for (const dep of deps ?? []) {
        if (dep.target_block_id === block.id && recentlyChanged.has(dep.source_block_id)) {
          depImpactRaw += dep.strength;
        }
      }
      const depComponent = clamp(depImpactRaw / 10, 0, 30);

      const openTasks = taskCounts[block.id] ?? 0;
      const taskComponent = Math.min(openTasks * 3, 10);

      const driftScore = clamp(Math.round(timeComponent + depComponent + taskComponent), 0, 100);
      const severity = severityFromScore(driftScore);

      const reasons = [];
      if (staleDays > 0) reasons.push({ type: "stale", stale_days: staleDays, sla });
      if (depImpactRaw > 0) reasons.push({ type: "impact", edges: deps?.filter((d: { target_block_id: string }) => d.target_block_id === block.id).length ?? 0, impact: depImpactRaw });
      if (openTasks > 0) reasons.push({ type: "open_tasks", count: openTasks });

      results.push({
        workspace_id,
        block_id: block.id,
        drift_score: driftScore,
        severity,
        stale_days: staleDays,
        dependency_impact: Math.round(depImpactRaw),
        confidence: 70,
        reasons_json: reasons,
        last_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Check for threshold crossing
      const prev = prevSeverity[block.id] ?? "ok";
      const severityOrder = ["ok", "warn", "risk", "critical"];
      if (severityOrder.indexOf(severity) > severityOrder.indexOf(prev) && severityOrder.indexOf(severity) >= 2) {
        alertsToCreate.push({
          workspace_id,
          type: "drift",
          title: `Drift ${severity.toUpperCase()}: bloco precisa atenção`,
          message: `O bloco está com drift score ${driftScore} (${staleDays} dias sem verificação)`,
          severity,
          related_block_id: block.id,
          action_suggestion_json: { action_id: "context.verify_block", params: { block_id: block.id } },
        });
      }
    }

    // Upsert drift scores
    for (const r of results) {
      await supabase.from("context_drift").upsert(r, { onConflict: "block_id" });
    }

    // Create alerts
    if (alertsToCreate.length > 0) {
      await supabase.from("context_alerts").insert(alertsToCreate);
    }

    return new Response(
      JSON.stringify({ computed: results.length, alerts: alertsToCreate.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
