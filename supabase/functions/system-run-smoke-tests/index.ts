import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckResult {
  module_id: string;
  check_name: string;
  passed: boolean;
  error?: string;
}

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

    // Create run record
    const { data: run, error: runErr } = await supabase
      .from("system_smoke_test_runs")
      .insert({ workspace_id, status: "running" })
      .select("id")
      .single();

    if (runErr) throw runErr;

    const checks: CheckResult[] = [];

    // CRM check: query leads
    try {
      const { count, error } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id);
      if (error) throw error;
      checks.push({ module_id: "crm-leads", check_name: "leads_query", passed: true });
    } catch (e) {
      checks.push({ module_id: "crm-leads", check_name: "leads_query", passed: false, error: (e as Error).message });
    }

    // Inbox check: query conversations
    try {
      const { count, error } = await supabase.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id);
      if (error) throw error;
      checks.push({ module_id: "inbox", check_name: "conversations_query", passed: true });
    } catch (e) {
      checks.push({ module_id: "inbox", check_name: "conversations_query", passed: false, error: (e as Error).message });
    }

    // Store check: query store_products
    try {
      const { count, error } = await supabase.from("store_products").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id);
      if (error) throw error;
      checks.push({ module_id: "store", check_name: "store_products_query", passed: true });
    } catch (e) {
      checks.push({ module_id: "store", check_name: "store_products_query", passed: false, error: (e as Error).message });
    }

    // Kernel check: query kernel_events
    try {
      const { count, error } = await supabase.from("kernel_events").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id);
      if (error) throw error;
      checks.push({ module_id: "kernel", check_name: "kernel_events_query", passed: true });
    } catch (e) {
      checks.push({ module_id: "kernel", check_name: "kernel_events_query", passed: false, error: (e as Error).message });
    }

    // AI check: query ai_agent_executions (lightweight)
    try {
      const { count, error } = await supabase.from("ai_agent_executions").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id);
      if (error) throw error;
      checks.push({ module_id: "ai-agents", check_name: "ai_executions_query", passed: true });
    } catch (e) {
      checks.push({ module_id: "ai-agents", check_name: "ai_executions_query", passed: false, error: (e as Error).message });
    }

    // Log failures
    const failures = checks.filter((c) => !c.passed);
    if (failures.length > 0) {
      await supabase.from("system_smoke_test_failures").insert(
        failures.map((f) => ({
          run_id: run.id,
          workspace_id,
          module_id: f.module_id,
          check_name: f.check_name,
          error_message: f.error ?? "Unknown error",
        }))
      );
    }

    // Update run
    const passed = checks.filter((c) => c.passed).length;
    await supabase
      .from("system_smoke_test_runs")
      .update({
        finished_at: new Date().toISOString(),
        total_checks: checks.length,
        passed,
        failed: failures.length,
        status: failures.length === 0 ? "completed" : "failed",
      })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({ run_id: run.id, total: checks.length, passed, failed: failures.length, checks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
