import {
  corsHeaders, jsonRes, evoFetch, getAdminClient, getEvolutionConfig,
  validateAuth, validateWorkspaceMembership, mapEvolutionState,
  isLogoutState, inferSyncHealth, reconcileRecoveryState, getWebhookUrl,
  normalizeEvolutionError,
} from "../_shared/evolution-api.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth
    const auth = await validateAuth(req);
    if (auth.error) return auth.error;

    const body = await req.json();
    const workspaceId = body?.workspaceId;
    const instanceName = body?.instanceName;
    if (!workspaceId || !instanceName) return jsonRes({ error: "Missing workspaceId or instanceName" }, 400);

    const membership = await validateWorkspaceMembership(auth.userId, workspaceId);
    if (membership.error) return membership.error;

    // 2. Config
    const evo = getEvolutionConfig();
    if ("error" in evo) return evo.error;
    const { baseUrl, apiKey } = evo;
    const { admin } = getAdminClient();

    // 3. Check for pending_action (async recovery from connect)
    const { data: existingConn } = await admin
      .from("whatsapp_qr_connections")
      .select("recovery_state, recovery_attempt_count, metadata_json, qr_code")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const metadata = (existingConn?.metadata_json as Record<string, unknown>) || {};
    const pendingAction = metadata?.pending_action as string | undefined;

    if (pendingAction === "restart_and_connect") {
      console.log(`[WHATSAPP_QR] EXECUTING_PENDING_ACTION=${pendingAction} instance=${instanceName}`);
      
      // Try restart
      await evoFetch(baseUrl, `/instance/restart/${instanceName}`, apiKey, { method: "PUT" });
      await new Promise((r) => setTimeout(r, 1500));

      // Check state
      const stateRes = await evoFetch(baseUrl, `/instance/connectionState/${instanceName}`, apiKey, { method: "GET" });
      const state = stateRes.data?.instance?.state || stateRes.data?.state;
      const now = new Date().toISOString();

      if (state === "open" || state === "connected") {
        await admin.from("whatsapp_qr_connections").update({
          status: "connected", connected_at: now, last_seen_at: now,
          metadata_json: {}, last_error: null, updated_at: now,
        }).eq("workspace_id", workspaceId);
        return jsonRes({ connected: true, status: "connected", phoneNumber: null });
      }

      // Try connect to get QR
      const connectRes = await evoFetch(baseUrl, `/instance/connect/${instanceName}`, apiKey, { method: "GET" });
      const qr = connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || connectRes.data?.code;

      if (qr) {
        await admin.from("whatsapp_qr_connections").update({
          status: "qr_pending", qr_code: qr, qr_updated_at: now,
          metadata_json: {}, last_error: null, updated_at: now,
        }).eq("workspace_id", workspaceId);
        return jsonRes({ connected: false, status: "qr_pending", qr_code: qr });
      }

      // Escalate: save delete_and_recreate for next poll
      await admin.from("whatsapp_qr_connections").update({
        metadata_json: { pending_action: "delete_and_recreate" },
        updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ connected: false, status: "creating_instance" });
    }

    if (pendingAction === "delete_and_recreate") {
      console.log(`[WHATSAPP_QR] EXECUTING_PENDING_ACTION=${pendingAction} instance=${instanceName}`);
      const now = new Date().toISOString();

      await evoFetch(baseUrl, `/instance/delete/${instanceName}`, apiKey, { method: "DELETE" });
      await new Promise((r) => setTimeout(r, 1000));

      const webhookUrl = getWebhookUrl();
      await evoFetch(baseUrl, "/instance/create", apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS",
          webhook: { url: webhookUrl, enabled: true, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"], webhook_by_events: false, webhook_base64: false },
        }),
      });

      const connectRes = await evoFetch(baseUrl, `/instance/connect/${instanceName}`, apiKey, { method: "GET" });
      const qr = connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || connectRes.data?.code;

      if (qr) {
        await admin.from("whatsapp_qr_connections").update({
          status: "qr_pending", qr_code: qr, qr_updated_at: now,
          metadata_json: {}, last_error: null, updated_at: now,
        }).eq("workspace_id", workspaceId);
        return jsonRes({ connected: false, status: "qr_pending", qr_code: qr });
      }

      // Final failure
      await admin.from("whatsapp_qr_connections").update({
        status: "error", last_error: "Não foi possível obter QR após recriação",
        metadata_json: {}, updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ connected: false, status: "error", last_error: "QR indisponível" });
    }

    // 4. Normal status check
    const statusRes = await evoFetch(baseUrl, `/instance/connectionState/${instanceName}`, apiKey, { method: "GET" });
    const evolutionState = statusRes.data?.instance?.state;

    // Fetch instances for LOGOUT detection + phone
    let instanceConnectionStatus: string | undefined;
    let phoneNumber: string | null = null;
    let errorMessage: string | null = null;

    const instancesRes = await evoFetch(baseUrl, `/instance/fetchInstances?instanceName=${instanceName}`, apiKey, { method: "GET" });
    if (instancesRes.ok) {
      const instance = Array.isArray(instancesRes.data) ? instancesRes.data[0] : instancesRes.data;
      instanceConnectionStatus = instance?.connectionStatus || instance?.instance?.connectionStatus;
      phoneNumber = instance?.ownerJid || instance?.instance?.owner || instance?.instance?.wuid || null;
      if (phoneNumber?.includes("@")) phoneNumber = phoneNumber.split("@")[0];
      errorMessage = normalizeEvolutionError(instance);
    }

    const isLogout = isLogoutState(evolutionState, instanceConnectionStatus);
    const mappedStatus = isLogout ? "disconnected" : mapEvolutionState(evolutionState);

    console.log(`[WHATSAPP_QR] STATUS instance=${instanceName} evo=${evolutionState} cs=${instanceConnectionStatus} logout=${isLogout} mapped=${mappedStatus}`);

    const now = new Date().toISOString();

    // Query message activity
    let lastInboundAt: string | null = null;
    let lastOutboundAt: string | null = null;
    try {
      const { data: li } = await admin.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "inbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastInboundAt = li?.sent_at || null;
      const { data: lo } = await admin.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "outbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastOutboundAt = lo?.sent_at || null;
    } catch { /* ignore */ }

    let sync_health: string;
    let sync_issue_reason: string | null;
    let recovery_state: string;
    let recovery_attempt_count: number;

    if (isLogout) {
      sync_health = "failed";
      sync_issue_reason = errorMessage || "Dispositivo desconectado (LOGOUT) — necessário novo emparelhamento";
      recovery_state = "repair_required";
      recovery_attempt_count = existingConn?.recovery_attempt_count || 0;
    } else {
      const healthResult = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt, mappedStatus === "connected" ? now : null, now);
      sync_health = healthResult.sync_health;
      sync_issue_reason = healthResult.sync_issue_reason;
      const recoveryResult = reconcileRecoveryState(sync_health, existingConn?.recovery_state || "none", existingConn?.recovery_attempt_count || 0);
      recovery_state = recoveryResult.recovery_state;
      recovery_attempt_count = recoveryResult.recovery_attempt_count;
    }

    // Build update
    const updatePayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      instance_name: instanceName,
      status: mappedStatus,
      sync_health, sync_issue_reason, recovery_state, recovery_attempt_count,
      last_health_check_at: now, last_seen_at: now, updated_at: now,
    };
    if (lastInboundAt) updatePayload.last_inbound_message_at = lastInboundAt;
    if (lastOutboundAt) updatePayload.last_outbound_message_at = lastOutboundAt;
    if (sync_health === "active") updatePayload.last_successful_sync_at = now;

    if (mappedStatus === "connected") {
      updatePayload.connected_at = now;
      updatePayload.phone_number = phoneNumber;
      updatePayload.last_error = null;
      updatePayload.disconnected_at = null;
      updatePayload.metadata_json = {};
    } else if (mappedStatus === "disconnected") {
      updatePayload.disconnected_at = now;
      updatePayload.last_error = errorMessage;
    }

    await admin.from("whatsapp_qr_connections").upsert(updatePayload, { onConflict: "workspace_id" });

    // Sync whatsapp_connections
    if (mappedStatus === "connected") {
      await admin.from("whatsapp_connections").upsert({
        workspace_id: workspaceId, is_active: true, display_phone_number: phoneNumber,
        connected_by: auth.userId, updated_at: now,
      }, { onConflict: "workspace_id" });
    } else if (isLogout) {
      await admin.from("whatsapp_connections").update({ is_active: false, updated_at: now }).eq("workspace_id", workspaceId);
    }

    // Return qr_code if it exists in DB (for async recovery)
    const qrCode = existingConn?.qr_code || null;

    return jsonRes({
      connected: mappedStatus === "connected",
      status: mappedStatus, sync_health, sync_issue_reason,
      recovery_state, recovery_attempt_count, phoneNumber,
      state: evolutionState, connectionStatus: instanceConnectionStatus,
      last_error: errorMessage, last_health_check_at: now,
      last_inbound_message_at: lastInboundAt, last_outbound_message_at: lastOutboundAt,
      ...(qrCode && mappedStatus !== "connected" ? { qr_code: qrCode } : {}),
    });
  } catch (error) {
    console.error("[WHATSAPP_QR] STATUS_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
