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

    // 1. Count stale impact_map items (needs_review older than 3 days)
    const staleThreshold = new Date(Date.now() - 3 * 86400_000).toISOString();
    const { data: staleImpacts } = await supabase
      .from("impact_map")
      .select("affected_kind, affected_id")
      .eq("workspace_id", workspace_id)
      .eq("status", "needs_review")
      .lt("created_at", staleThreshold);

    // 2. Count unresolved decisions
    const { count: openDecisions } = await supabase
      .from("kernel_decisions")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id)
      .eq("status", "open");

    // 3. Context drift from existing system
    const { data: contextDrift } = await supabase
      .from("context_drift")
      .select("drift_score, severity")
      .eq("workspace_id", workspace_id)
      .in("severity", ["risk", "critical"]);

    // Compute workspace-level drift
    const staleCount = staleImpacts?.length ?? 0;
    const decisionCount = openDecisions ?? 0;
    const criticalDrift = contextDrift?.filter(d => d.severity === "critical").length ?? 0;
    const riskDrift = contextDrift?.filter(d => d.severity === "risk").length ?? 0;

    const workspaceScore = clamp(
      Math.round(
        (staleCount * 5) +
        (decisionCount * 3) +
        (criticalDrift * 10) +
        (riskDrift * 5)
      ),
      0,
      100
    );

    const reasons = [];
    if (staleCount > 0) reasons.push({ type: "stale_impacts", count: staleCount });
    if (decisionCount > 0) reasons.push({ type: "open_decisions", count: decisionCount });
    if (criticalDrift > 0) reasons.push({ type: "critical_context_drift", count: criticalDrift });
    if (riskDrift > 0) reasons.push({ type: "risk_context_drift", count: riskDrift });

    // Upsert workspace-level drift
    await supabase.from("drift_scores").upsert(
      {
        workspace_id,
        scope_type: "workspace",
        scope_kind: "workspace",
        scope_id: workspace_id,
        score: workspaceScore,
        reasons,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,scope_type,scope_kind,scope_id" }
    );

    // Update per-asset drift for stale impacts
    for (const item of staleImpacts ?? []) {
      const staleDays = Math.floor((Date.now() - new Date(staleThreshold).getTime()) / 86400_000) + 3;
      await supabase.from("drift_scores").upsert(
        {
          workspace_id,
          scope_type: "asset",
          scope_kind: item.affected_kind,
          scope_id: item.affected_id,
          score: clamp(staleDays * 8, 0, 100),
          reasons: [{ type: "stale_impact", stale_days: staleDays }],
          computed_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,scope_type,scope_kind,scope_id" }
      );
    }

    // Create alert if workspace drift is high
    if (workspaceScore >= 60) {
      await supabase.from("context_alerts").insert({
        workspace_id,
        type: "kernel_drift",
        title: `Drift do workspace em ${workspaceScore}%`,
        message: `${staleCount} impactos pendentes, ${decisionCount} decisões abertas`,
        severity: workspaceScore >= 80 ? "critical" : "risk",
      });
    }

    return new Response(
      JSON.stringify({ workspace_score: workspaceScore, reasons, assets_updated: staleImpacts?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
