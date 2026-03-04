import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const workspace_id = body.workspace_id;
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const d7 = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();

    // Get all function runs for workspace (last 7d)
    const { data: runs7d } = await supabase
      .from("system_function_runs")
      .select("module_id, status, latency_ms, created_at")
      .eq("workspace_id", workspace_id)
      .gte("created_at", d7)
      .order("created_at", { ascending: false })
      .limit(1000);

    // Get latest smoke test failures
    const { data: latestSmoke } = await supabase
      .from("system_smoke_test_runs")
      .select("id, status")
      .eq("workspace_id", workspace_id)
      .order("started_at", { ascending: false })
      .limit(1);

    let smokeFailModules: Set<string> = new Set();
    if (latestSmoke?.[0]?.status === "failed") {
      const { data: failures } = await supabase
        .from("system_smoke_test_failures")
        .select("module_id")
        .eq("run_id", latestSmoke[0].id);
      failures?.forEach((f) => smokeFailModules.add(f.module_id));
    }

    // Aggregate by module
    const moduleMap = new Map<string, {
      total24h: number; errors24h: number;
      total7d: number; errors7d: number;
      latencies: number[]; lastError: string | null;
    }>();

    for (const run of runs7d ?? []) {
      const mid = run.module_id ?? "unknown";
      if (!moduleMap.has(mid)) {
        moduleMap.set(mid, { total24h: 0, errors24h: 0, total7d: 0, errors7d: 0, latencies: [], lastError: null });
      }
      const m = moduleMap.get(mid)!;
      m.total7d++;
      if (run.status === "error") {
        m.errors7d++;
        if (!m.lastError) m.lastError = `Function error`;
      }
      if (run.latency_ms) m.latencies.push(run.latency_ms);
      if (run.created_at >= h24) {
        m.total24h++;
        if (run.status === "error") m.errors24h++;
      }
    }

    // Compute p95 and upsert
    const upserts: any[] = [];
    for (const [moduleId, stats] of moduleMap) {
      const successRate = stats.total7d > 0 ? ((stats.total7d - stats.errors7d) / stats.total7d) * 100 : 100;
      const sorted = stats.latencies.sort((a, b) => a - b);
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
      const smokeFail = smokeFailModules.has(moduleId);

      let status = "ok";
      if (smokeFail || successRate < 80) status = "down";
      else if (successRate < 95) status = "degraded";

      upserts.push({
        workspace_id,
        module_id: moduleId,
        status,
        last_error: stats.lastError,
        failures_24h: stats.errors24h,
        failures_7d: stats.errors7d,
        success_rate: Math.round(successRate * 100) / 100,
        p95_latency_ms: p95,
        smoke_status: smokeFail ? "fail" : (latestSmoke?.length ? "pass" : "pending"),
        computed_at: now.toISOString(),
      });
    }

    // Also add modules from smoke test that have no function runs
    for (const mid of smokeFailModules) {
      if (!moduleMap.has(mid)) {
        upserts.push({
          workspace_id,
          module_id: mid,
          status: "down",
          last_error: "Smoke test failed",
          failures_24h: 0,
          failures_7d: 0,
          success_rate: 0,
          p95_latency_ms: 0,
          smoke_status: "fail",
          computed_at: now.toISOString(),
        });
      }
    }

    if (upserts.length > 0) {
      await supabase
        .from("feature_registry_runtime")
        .upsert(upserts, { onConflict: "workspace_id,module_id" });
    }

    return new Response(
      JSON.stringify({ modules_computed: upserts.length, upserts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
