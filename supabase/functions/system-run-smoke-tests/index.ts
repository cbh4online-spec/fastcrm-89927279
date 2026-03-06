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
      runCheck(supabase, workspace_id, "crm-companies", "companies_query", "companies"),
      runCheck(supabase, workspace_id, "crm-contacts", "contacts_query", "contacts"),
      runCheck(supabase, workspace_id, "crm-leads", "leads_query", "leads"),
      runCheck(supabase, workspace_id, "crm-opportunities", "opportunities_query", "opportunities"),
      runCheck(supabase, workspace_id, "crm-deal-score", "deal_scores_query", "deal_scores"),
      runCheck(supabase, workspace_id, "crm-activities", "crm_activities_query", "crm_activities"),
      runCheck(supabase, workspace_id, "crm-leads", "lead_behavior_signals_query", "lead_behavior_signals"),
      // Inbox
      runCheck(supabase, workspace_id, "inbox", "conversations_query", "conversations"),
      runCheck(supabase, workspace_id, "inbox-messages", "messages_query", "messages"),
      // Context OS
      runCheck(supabase, workspace_id, "context-os", "context_blocks_query", "context_blocks"),
      runCheck(supabase, workspace_id, "context-os-fields", "context_fields_query", "context_fields"),
      // AI Agents
      runCheck(supabase, workspace_id, "ai-agents", "ai_jobs_query", "ai_agent_jobs"),
      runCheck(supabase, workspace_id, "ai-agents", "ai_registry_query", "ai_agent_registry"),
      runCheck(supabase, workspace_id, "ai-agents", "ai_executions_query", "ai_agent_executions"),
      runCheck(supabase, workspace_id, "ai-agents", "ai_locks_query", "ai_agent_locks"),
      runCheck(supabase, workspace_id, "ai-agents", "ai_memory_query", "ai_agent_memory"),
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
      // Admin Settings (admin_settings is global — no workspace_id filter, use a simple query)
      (async (): Promise<CheckResult> => {
        try {
          const { error } = await supabase.from("admin_settings").select("id", { count: "exact", head: true });
          if (error) throw error;
          return { module_id: "admin-settings", check_name: "admin_settings_query", passed: true };
        } catch (e) {
          return { module_id: "admin-settings", check_name: "admin_settings_query", passed: false, error: (e as Error).message };
        }
      })(),
      runCheck(supabase, workspace_id, "admin-settings", "store_settings_query", "store_settings"),
      runCheck(supabase, workspace_id, "admin-settings", "client_notification_settings_query", "client_notification_settings"),
      // Core Calendar
      runCheck(supabase, workspace_id, "core-calendar", "meetings_query", "meetings"),
      runCheck(supabase, workspace_id, "core-calendar", "calendar_events_query", "calendar_events"),
      runCheck(supabase, workspace_id, "core-calendar", "calendars_query", "calendars"),
      runCheck(supabase, workspace_id, "core-calendar", "ai_booking_calendars_query", "ai_booking_calendars"),
      // Admin Workspaces
      runCheck(supabase, workspace_id, "admin-workspaces", "workspace_members_query", "workspace_members"),
      // Core Forms
      runCheck(supabase, workspace_id, "core-forms", "forms_query", "forms"),
      runCheck(supabase, workspace_id, "core-forms", "form_submissions_query", "form_submissions"),
      // Admin Integrations
      runCheck(supabase, workspace_id, "admin-integrations", "stripe_config_query", "workspace_stripe_config"),
      runCheck(supabase, workspace_id, "admin-integrations", "ghl_config_query", "workspace_ghl_config"),
      runCheck(supabase, workspace_id, "admin-integrations", "whatsapp_connections_query", "whatsapp_connections"),
      runCheck(supabase, workspace_id, "admin-integrations", "instagram_connections_query", "instagram_connections"),
      runCheck(supabase, workspace_id, "admin-integrations", "email_connections_query", "email_connections"),
      // Core Imports
      runCheck(supabase, workspace_id, "core-imports", "import_history_query", "import_history"),
      // Core Files
      runCheck(supabase, workspace_id, "core-files", "entity_documents_query", "entity_documents"),
      runCheck(supabase, workspace_id, "core-files", "contact_documents_query", "contact_documents"),
      // Core Feed
      runCheck(supabase, workspace_id, "core-feed", "internal_posts_query", "internal_posts"),
      runCheck(supabase, workspace_id, "core-feed", "post_comments_query", "post_comments"),
      // Core Custom Fields
      runCheck(supabase, workspace_id, "core-custom-fields", "custom_fields_query", "custom_fields"),
      runCheck(supabase, workspace_id, "core-custom-fields", "custom_field_values_query", "custom_field_values"),
      runCheck(supabase, workspace_id, "core-custom-fields", "core_object_fields_query", "core_object_fields"),
      // Core Dashboard
      runCheck(supabase, workspace_id, "core-dashboard", "report_dashboards_query", "report_dashboards"),
      runCheck(supabase, workspace_id, "core-dashboard", "report_widgets_query", "report_widgets"),
      // CRM Lead Enricher
      runCheck(supabase, workspace_id, "crm-lead-enricher", "lead_enricher_settings_query", "lead_enricher_settings"),
      runCheck(supabase, workspace_id, "crm-lead-enricher", "credit_consumption_logs_query", "credit_consumption_logs"),
      // CRM FastMatch
      runCheck(supabase, workspace_id, "crm-fastmatch", "fastmatch_profiles_query", "fastmatch_profiles"),
      runCheck(supabase, workspace_id, "crm-fastmatch", "fastmatch_connections_query", "fastmatch_connections"),
      runCheck(supabase, workspace_id, "crm-fastmatch", "fastmatch_interests_query", "fastmatch_interests"),
      // Comm Email
      runCheck(supabase, workspace_id, "comm-email", "conversations_query", "conversations"),
      runCheck(supabase, workspace_id, "comm-email", "messages_query", "messages"),
      runCheck(supabase, workspace_id, "comm-email", "email_sequences_query", "email_sequences"),
      // Sales Proposals
      runCheck(supabase, workspace_id, "sales-proposals", "proposals_query", "proposals"),
      runCheck(supabase, workspace_id, "sales-proposals", "proposal_items_query", "proposal_items"),
      runCheck(supabase, workspace_id, "sales-proposals", "proposal_templates_query", "proposal_templates"),
      // Sales Products
      runCheck(supabase, workspace_id, "sales-products", "products_query", "products"),
      runCheck(supabase, workspace_id, "sales-products", "product_categories_query", "product_categories"),
      runCheck(supabase, workspace_id, "sales-products", "product_images_query", "product_images"),
      // Sales Bundles
      runCheck(supabase, workspace_id, "sales-bundles", "product_protocols_query", "product_protocols"),
      runCheck(supabase, workspace_id, "sales-bundles", "protocol_products_query", "protocol_products"),
      runCheck(supabase, workspace_id, "sales-bundles", "product_components_query", "product_components"),
      // Sales Orders
      runCheck(supabase, workspace_id, "sales-orders", "store_orders_query", "store_orders"),
      runCheck(supabase, workspace_id, "sales-orders", "store_order_events_query", "store_order_events"),
      runCheck(supabase, workspace_id, "sales-orders", "order_notes_query", "order_notes"),
      runCheck(supabase, workspace_id, "sales-orders", "order_note_items_query", "order_note_items"),
      // Mkt Prospecting
      runCheck(supabase, workspace_id, "mkt-prospecting", "prospecting_searches_query", "professional_prospecting_searches"),
      runCheck(supabase, workspace_id, "mkt-prospecting", "prospecting_profiles_query", "professional_prospecting_profiles"),
      runCheck(supabase, workspace_id, "mkt-prospecting", "prospecting_outreach_queue_query", "prospecting_outreach_queue"),
      // Mkt Bio OS
      runCheck(supabase, workspace_id, "mkt-bio-os", "bio_pages_query", "bio_pages"),
      runCheck(supabase, workspace_id, "mkt-bio-os", "bio_blocks_query", "bio_blocks"),
      runCheck(supabase, workspace_id, "mkt-bio-os", "bio_events_query", "bio_events"),
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
