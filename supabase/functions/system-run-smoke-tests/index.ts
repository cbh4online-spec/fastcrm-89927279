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

async function runCheck(
  supabase: ReturnType<typeof createClient>,
  workspace_id: string,
  module_id: string,
  check_name: string,
  table: string,
): Promise<CheckResult> {
  try {
    const { error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);
    if (error) throw error;
    return { module_id, check_name, passed: true };
  } catch (e) {
    return { module_id, check_name, passed: false, error: (e as Error).message };
  }
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

    // Run all checks in parallel
    const checks = await Promise.all([
      // CRM
      runCheck(supabase, workspace_id, "crm-leads", "leads_query", "leads"),
      runCheck(supabase, workspace_id, "crm-opportunities", "opportunities_query", "opportunities"),
      // Inbox
      runCheck(supabase, workspace_id, "inbox", "conversations_query", "conversations"),
      runCheck(supabase, workspace_id, "inbox-messages", "messages_query", "messages"),
      // Context OS
      runCheck(supabase, workspace_id, "context-os", "context_blocks_query", "context_blocks"),
      runCheck(supabase, workspace_id, "context-os-fields", "context_fields_query", "context_fields"),
      // AI Agents
      runCheck(supabase, workspace_id, "ai-agents", "ai_jobs_query", "ai_agent_jobs"),
      runCheck(supabase, workspace_id, "ai-agents-registry", "ai_registry_query", "ai_agent_registry"),
      // Kernel
      runCheck(supabase, workspace_id, "kernel", "kernel_events_query", "kernel_events"),
      // Inbox Action Logs
      runCheck(supabase, workspace_id, "inbox-action-logs", "inbox_action_logs_query", "inbox_action_logs"),
    ]);

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
