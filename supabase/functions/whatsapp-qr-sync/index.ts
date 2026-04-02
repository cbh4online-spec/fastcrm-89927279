import {
  corsHeaders, jsonRes, evoFetch, getAdminClient, getEvolutionConfig,
  validateAuth, validateWorkspaceMembership, instanceNameFor,
  inferSyncHealth, getWebhookUrl,
} from "../_shared/evolution-api.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth
    const auth = await validateAuth(req);
    if (auth.error) return auth.error;

    const body = await req.json();
    const workspaceId = body?.workspaceId;
    if (!workspaceId || typeof workspaceId !== "string") return jsonRes({ error: "Missing workspaceId" }, 400);

    const membership = await validateWorkspaceMembership(auth.userId, workspaceId);
    if (membership.error) return membership.error;

    // 2. Config
    const evo = getEvolutionConfig();
    if ("error" in evo) return evo.error;
    const { baseUrl, apiKey } = evo;
    const { admin } = getAdminClient();

    const instanceName = instanceNameFor(workspaceId);
    console.log(`[WA_SYNC] START ws=${workspaceId} instance=${instanceName}`);

    const { data: existingConn } = await admin
      .from("whatsapp_qr_connections")
      .select("recovery_state, recovery_attempt_count")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Check Evolution state
    const stateRes = await evoFetch(baseUrl, `/instance/connectionState/${instanceName}`, apiKey, { method: "GET" });
    const evolutionState = stateRes.ok ? (stateRes.data?.instance?.state || null) : null;
    const now = new Date().toISOString();

    if (!evolutionState) {
      await admin.from("whatsapp_qr_connections").upsert({
        workspace_id: workspaceId, instance_name: instanceName,
        status: "not_configured", sync_health: "unknown",
        sync_issue_reason: "Instância não encontrada", recovery_state: "none",
        recovery_attempt_count: 0, last_health_check_at: now, updated_at: now,
      }, { onConflict: "workspace_id" });
      return jsonRes({ status: "not_configured", sync_health: "unknown", synced: true });
    }

    const mappedStatus = evolutionState === "open" ? "connected" : evolutionState === "close" ? "disconnected" : evolutionState === "connecting" ? "waiting_for_scan" : "disconnected";

    // Get phone if connected
    let phoneNumber: string | null = null;
    if (mappedStatus === "connected") {
      const infoRes = await evoFetch(baseUrl, `/instance/fetchInstances?instanceName=${instanceName}`, apiKey, { method: "GET" });
      if (infoRes.ok) {
        const inst = Array.isArray(infoRes.data) ? infoRes.data[0] : infoRes.data;
        phoneNumber = inst?.ownerJid || inst?.instance?.owner || inst?.instance?.wuid || null;
        if (phoneNumber?.includes("@")) phoneNumber = phoneNumber.split("@")[0];
      }
    }

    // Message activity
    let lastInboundAt: string | null = null;
    let lastOutboundAt: string | null = null;
    try {
      const { data: li } = await admin.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "inbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastInboundAt = li?.sent_at || null;
      const { data: lo } = await admin.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "outbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastOutboundAt = lo?.sent_at || null;
    } catch { /* ignore */ }

    const { sync_health, sync_issue_reason } = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt, mappedStatus === "connected" ? now : null, now);

    let recovery_state = existingConn?.recovery_state || "none";
    let recovery_attempt_count = existingConn?.recovery_attempt_count || 0;
    if (sync_health === "active") { recovery_state = "none"; recovery_attempt_count = 0; }
    else if (recovery_attempt_count >= 3 && (sync_health === "suspended" || sync_health === "failed")) {
      recovery_state = "repair_required";
    }

    // Set webhook
    const webhookUrl = getWebhookUrl();
    await evoFetch(baseUrl, `/webhook/set/${instanceName}`, apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook: { url: webhookUrl, enabled: true, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"], webhook_by_events: false, webhook_base64: false },
      }),
    });

    const update: Record<string, unknown> = {
      workspace_id: workspaceId, instance_name: instanceName,
      status: mappedStatus, sync_health, sync_issue_reason,
      recovery_state, recovery_attempt_count,
      last_health_check_at: now, last_seen_at: now, updated_at: now,
    };
    if (lastInboundAt) update.last_inbound_message_at = lastInboundAt;
    if (lastOutboundAt) update.last_outbound_message_at = lastOutboundAt;
    if (sync_health === "active") update.last_successful_sync_at = now;
    if (mappedStatus === "connected") {
      update.connected_at = now; update.phone_number = phoneNumber; update.last_error = null;
    } else if (mappedStatus === "disconnected") { update.disconnected_at = now; }

    await admin.from("whatsapp_qr_connections").upsert(update, { onConflict: "workspace_id" });

    if (mappedStatus === "connected") {
      await admin.from("whatsapp_connections").upsert({
        workspace_id: workspaceId, is_active: true, display_phone_number: phoneNumber, updated_at: now,
      }, { onConflict: "workspace_id" });
    } else {
      await admin.from("whatsapp_connections").update({ is_active: false, updated_at: now }).eq("workspace_id", workspaceId);
    }

    console.log(`[WA_SYNC] DONE ws=${workspaceId} status=${mappedStatus} health=${sync_health}`);
    return jsonRes({ status: mappedStatus, sync_health, sync_issue_reason, recovery_state, recovery_attempt_count, phoneNumber, synced: true });
  } catch (error) {
    console.error("[WA_SYNC] ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
