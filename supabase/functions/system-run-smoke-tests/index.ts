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

    // AI Conversational smoke test
    const aiConversationalCheck = async (): Promise<CheckResult> => {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          return { module_id: "ai-conversational", check_name: "classify_schema", passed: false, error: "LOVABLE_API_KEY not configured" };
        }
        const sampleMessages = [{ direction: "inbound", content: "Quanto custa o plano premium?" }];
        const classifyResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/classify-conversation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ messages: sampleMessages }),
        });
        if (!classifyResp.ok) {
          return { module_id: "ai-conversational", check_name: "classify_schema", passed: false, error: `HTTP ${classifyResp.status}` };
        }
        const result = await classifyResp.json();
        const hasSchema = result.priority && result.intent && result.sentiment;
        return { module_id: "ai-conversational", check_name: "classify_schema", passed: !!hasSchema, error: hasSchema ? undefined : "Missing required fields in response" };
      } catch (e) {
        return { module_id: "ai-conversational", check_name: "classify_schema", passed: false, error: (e as Error).message };
      }
    };

    // Run all checks in parallel
    const checks = await Promise.all([
      // CRM
      runCheck(supabase, workspace_id, "crm-leads", "leads_query", "leads"),
      runCheck(supabase, workspace_id, "crm-opportunities", "opportunities_query", "opportunities"),
      runCheck(supabase, workspace_id, "crm-deal-score", "deal_scores_query", "deal_scores"),
      runCheck(supabase, workspace_id, "crm-activities", "crm_activities_query", "crm_activities"),
      // Inbox
      runCheck(supabase, workspace_id, "inbox", "conversations_query", "conversations"),
      runCheck(supabase, workspace_id, "inbox-messages", "messages_query", "messages"),
      // Context OS
      runCheck(supabase, workspace_id, "context-os", "context_blocks_query", "context_blocks"),
      runCheck(supabase, workspace_id, "context-os-fields", "context_fields_query", "context_fields"),
      // AI Agents
      runCheck(supabase, workspace_id, "ai-agents", "ai_jobs_query", "ai_agent_jobs"),
      runCheck(supabase, workspace_id, "ai-agents-registry", "ai_registry_query", "ai_agent_registry"),
      // AI Personas & Knowledge Bases
      runCheck(supabase, workspace_id, "ai-personas", "ai_personas_query", "ai_personas"),
      runCheck(supabase, workspace_id, "ai-knowledge-bases", "knowledge_bases_query", "knowledge_bases"),
      // Kernel
      runCheck(supabase, workspace_id, "kernel", "kernel_events_query", "kernel_events"),
      // Inbox Action Logs
      runCheck(supabase, workspace_id, "inbox-action-logs", "inbox_action_logs_query", "inbox_action_logs"),
      // B2B Portal
      runCheck(supabase, workspace_id, "b2b-portal", "client_users_query", "client_users"),
      // Comm Templates
      runCheck(supabase, workspace_id, "comm-templates", "communication_templates_query", "communication_templates"),
      runCheck(supabase, workspace_id, "comm-templates-usage", "template_usage_logs_query", "template_usage_logs"),
      // Core Productivity
      runCheck(supabase, workspace_id, "core-productivity", "tasks_query", "tasks"),
      // Strategy Command Center
      runCheck(supabase, workspace_id, "strategy-decisions", "strategic_decisions_query", "strategic_decisions"),
      runCheck(supabase, workspace_id, "strategy-kernel", "kernel_decisions_query", "kernel_decisions"),
      runCheck(supabase, workspace_id, "strategy-actions", "kernel_action_runs_query", "kernel_action_runs"),
      // Context OS extended
      runCheck(supabase, workspace_id, "context-os-drift", "context_drift_query", "context_drift"),
      runCheck(supabase, workspace_id, "context-os-bindings", "context_bindings_query", "context_bindings"),
      runCheck(supabase, workspace_id, "context-os-deps", "context_dependencies_query", "context_dependencies"),
      // MKT Landing Pages
      runCheck(supabase, workspace_id, "mkt-landing-pages", "landing_pages_query", "landing_pages"),
      // MKT Email Marketing
      runCheck(supabase, workspace_id, "mkt-email-marketing", "marketing_campaigns_query", "marketing_campaigns"),
      runCheck(supabase, workspace_id, "mkt-email-marketing", "marketing_recipients_query", "marketing_recipients"),
      runCheck(supabase, workspace_id, "mkt-email-marketing", "marketing_events_query", "marketing_events"),
      // AI Conversational
      aiConversationalCheck(),
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
