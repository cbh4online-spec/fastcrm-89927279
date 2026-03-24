import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { test: string; status: string; message: string; duration_ms: number }[] = [];

    // Test 1: accounts table readable
    const t1Start = Date.now();
    try {
      const { count, error } = await supabase
        .from("account_brief_accounts")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      results.push({ test: "accounts_readable", status: "pass", message: `${count} contas`, duration_ms: Date.now() - t1Start });
    } catch (e: any) {
      results.push({ test: "accounts_readable", status: "fail", message: e.message, duration_ms: Date.now() - t1Start });
    }

    // Test 2: briefs table readable
    const t2Start = Date.now();
    try {
      const { count, error } = await supabase
        .from("account_brief_briefs")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      results.push({ test: "briefs_readable", status: "pass", message: `${count} briefs`, duration_ms: Date.now() - t2Start });
    } catch (e: any) {
      results.push({ test: "briefs_readable", status: "fail", message: e.message, duration_ms: Date.now() - t2Start });
    }

    // Test 3: scores table readable
    const t3Start = Date.now();
    try {
      const { count, error } = await supabase
        .from("account_brief_scores")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      results.push({ test: "scores_readable", status: "pass", message: `${count} scores`, duration_ms: Date.now() - t3Start });
    } catch (e: any) {
      results.push({ test: "scores_readable", status: "fail", message: e.message, duration_ms: Date.now() - t3Start });
    }

    // Test 4: watchlist table readable
    const t4Start = Date.now();
    try {
      const { count, error } = await supabase
        .from("account_brief_watchlists")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      results.push({ test: "watchlist_readable", status: "pass", message: `${count} items`, duration_ms: Date.now() - t4Start });
    } catch (e: any) {
      results.push({ test: "watchlist_readable", status: "fail", message: e.message, duration_ms: Date.now() - t4Start });
    }

    // Test 5: job queue readable
    const t5Start = Date.now();
    try {
      const { count, error } = await supabase
        .from("account_brief_job_queue")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      results.push({ test: "job_queue_readable", status: "pass", message: `${count} jobs`, duration_ms: Date.now() - t5Start });
    } catch (e: any) {
      results.push({ test: "job_queue_readable", status: "fail", message: e.message, duration_ms: Date.now() - t5Start });
    }

    // Test 6: usage counters readable
    const t6Start = Date.now();
    try {
      const { count, error } = await supabase
        .from("account_brief_usage_counters")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace_id);
      if (error) throw error;
      results.push({ test: "usage_counters_readable", status: "pass", message: `${count} counters`, duration_ms: Date.now() - t6Start });
    } catch (e: any) {
      results.push({ test: "usage_counters_readable", status: "fail", message: e.message, duration_ms: Date.now() - t6Start });
    }

    const passCount = results.filter((r) => r.status === "pass").length;
    const failCount = results.filter((r) => r.status === "fail").length;
    const overallStatus = failCount === 0 ? "pass" : "fail";

    // Log to system_smoke_test_runs if table exists
    try {
      await supabase.from("system_smoke_test_runs").insert({
        workspace_id,
        module_id: "account-brief",
        status: overallStatus,
        tests_passed: passCount,
        tests_failed: failCount,
        tests_total: results.length,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        results_json: results,
      });
    } catch (_e) {
      // Non-critical
    }

    return new Response(
      JSON.stringify({ status: overallStatus, passed: passCount, failed: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
