import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const { event, workspaceId, payload } = await req.json();

    if (!workspaceId || !event) {
      return new Response(JSON.stringify({ error: "Missing event or workspaceId" }), { status: 400, headers: corsHeaders });
    }

    // Verify workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Supported internal webhook events
    const supportedEvents = [
      "account_brief.account_created",
      "account_brief.analysis_completed",
      "account_brief.score_changed",
      "account_brief.site_change_detected",
      "account_brief.watchlist_triggered",
      "account_brief.outreach_generated",
      "account_brief.segment_created",
      "account_brief.crm_linked",
      "account_brief.batch_started",
      "account_brief.batch_completed",
      "account_brief.limit_reached",
      "account_brief.score_version_changed",
    ];

    if (!supportedEvents.includes(event)) {
      return new Response(JSON.stringify({ error: `Unsupported event: ${event}` }), { status: 400, headers: corsHeaders });
    }

    // Persist to kernel event log
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const eventPayload = {
      workspace_id: workspaceId,
      event_type: event,
      module: "account-brief",
      entity_type: payload?.entity_type || "account",
      entity_id: payload?.entity_id || null,
      actor_id: userId,
      correlation_id: payload?.correlation_id || null,
      payload_json: payload || {},
      created_at: new Date().toISOString(),
    };

    // Try to insert into context_event_log (kernel event bus)
    await serviceClient
      .from("context_event_log")
      .insert([{
        workspace_id: workspaceId,
        event_type: event,
        source_module: "account-brief",
        payload: eventPayload,
        created_at: new Date().toISOString(),
      }]);

    // Also create a notification for relevant events
    const notificationEvents = [
      "account_brief.analysis_completed",
      "account_brief.site_change_detected",
      "account_brief.limit_reached",
      "account_brief.score_changed",
    ];

    if (notificationEvents.includes(event)) {
      await serviceClient
        .from("account_brief_notifications")
        .insert([{
          workspace_id: workspaceId,
          account_id: payload?.account_id || null,
          notification_type: event.replace("account_brief.", ""),
          priority: event.includes("limit_reached") ? "high" : "medium",
          title: getEventTitle(event),
          body: payload?.message || getEventDescription(event, payload),
          channel: "in_app",
        }]);
    }

    return new Response(JSON.stringify({ ok: true, event }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

function getEventTitle(event: string): string {
  const titles: Record<string, string> = {
    "account_brief.analysis_completed": "Análise concluída",
    "account_brief.site_change_detected": "Mudança detetada no site",
    "account_brief.limit_reached": "Limite de utilização atingido",
    "account_brief.score_changed": "Score alterado",
  };
  return titles[event] || event;
}

function getEventDescription(event: string, payload: Record<string, unknown>): string {
  if (event === "account_brief.analysis_completed") {
    return `Análise da conta ${payload?.account_name || ""} concluída com sucesso.`;
  }
  if (event === "account_brief.site_change_detected") {
    return `Mudança comercial detetada em ${payload?.account_name || "conta"}.`;
  }
  if (event === "account_brief.limit_reached") {
    return `Atingiu o limite de ${payload?.metric_key || "utilização"} do plano.`;
  }
  if (event === "account_brief.score_changed") {
    return `Score de ${payload?.account_name || "conta"} alterado para ${payload?.new_score || "N/A"}.`;
  }
  return "Evento processado.";
}
