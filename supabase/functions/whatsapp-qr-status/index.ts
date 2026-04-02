import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapEvolutionState(state: string | undefined): string {
  switch (state?.toUpperCase()) {
    case "OPEN":
    case "open":
      return "connected";
    case "CLOSE":
    case "close":
      return "disconnected";
    case "CONNECTING":
    case "connecting":
      return "waiting_for_scan";
    case "LOGOUT":
    case "logout":
      return "disconnected";
    case "NOT_CONNECTION":
    case "not_connection":
      return "disconnected";
    case "PAIRING":
    case "pairing":
      return "authenticating";
    default:
      return "error";
  }
}

/** Check if a state indicates the device has been logged out / requires new pairing */
function isLogoutState(state: string | undefined, connectionStatus: string | undefined): boolean {
  const s = state?.toUpperCase();
  const cs = connectionStatus?.toUpperCase();
  return s === "LOGOUT" || cs === "NOT_CONNECTION" || cs === "LOGOUT";
}

function inferSyncHealth(
  connectionStatus: string,
  lastInboundAt: string | null,
  lastOutboundAt: string | null,
  connectedAt: string | null = null,
  lastSeenAt: string | null = null,
): { sync_health: string; sync_issue_reason: string | null } {
  if (connectionStatus !== "connected") {
    return { sync_health: "failed", sync_issue_reason: "Sessão WhatsApp não está conectada" };
  }
  const now = Date.now();
  const twentyFourH = 24 * 60 * 60 * 1000;

  if (lastInboundAt) {
    const inboundAge = now - new Date(lastInboundAt).getTime();
    const thirtyMin = 30 * 60 * 1000;
    const twoHours = 2 * 60 * 60 * 1000;
    if (inboundAge < thirtyMin) return { sync_health: "active", sync_issue_reason: null };
    if (inboundAge < twoHours) return { sync_health: "delayed", sync_issue_reason: `Sem mensagens inbound há ${Math.round(inboundAge / 60000)} minutos` };
  }

  const freshestActivity = [connectedAt, lastSeenAt, lastOutboundAt]
    .filter(Boolean)
    .map((d) => new Date(d!).getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  if (freshestActivity > 0) {
    const activityAge = now - freshestActivity;
    if (activityAge < twentyFourH) return { sync_health: "active", sync_issue_reason: null };
    return { sync_health: "suspended", sync_issue_reason: `Sem qualquer actividade há mais de ${Math.round(activityAge / 3600000)} horas` };
  }

  return { sync_health: "unknown", sync_issue_reason: "Sem dados de actividade para inferir saúde de sincronização" };
}

function reconcileRecoveryState(
  syncHealth: string,
  currentRecoveryState: string,
  attemptCount: number,
): { recovery_state: string; recovery_attempt_count: number } {
  if (syncHealth === "active") {
    return { recovery_state: "none", recovery_attempt_count: 0 };
  }
  if (currentRecoveryState === "repair_required") {
    return { recovery_state: "repair_required", recovery_attempt_count: attemptCount };
  }
  if (attemptCount >= 3 && (syncHealth === "suspended" || syncHealth === "failed" || syncHealth === "degraded")) {
    return { recovery_state: "repair_required", recovery_attempt_count: attemptCount };
  }
  return { recovery_state: currentRecoveryState || "none", recovery_attempt_count: attemptCount };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId, instanceName } = await req.json();
    if (!workspaceId || !instanceName) return jsonRes({ error: "Missing workspaceId or instanceName" }, 400);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return jsonRes({ error: "Evolution API not configured" }, 500);

    let finalUrl = EVOLUTION_API_URL.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) finalUrl = `https://${finalUrl}`;
    const baseUrl = new URL(finalUrl).origin;

    // 1. Get connectionState
    const statusRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });
    const statusData = await statusRes.json();
    const evolutionState = statusData?.instance?.state;

    // 2. Also fetch instance details for connectionStatus + error info
    let instanceConnectionStatus: string | undefined;
    let instanceError: string | null = null;
    let phoneNumber: string | null = null;
    let disconnectionReason: string | null = null;

    try {
      const instancesRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      const instancesData = await instancesRes.json();
      const instance = Array.isArray(instancesData) ? instancesData[0] : instancesData;

      instanceConnectionStatus = instance?.connectionStatus || instance?.instance?.connectionStatus;

      // Extract phone number
      phoneNumber = instance?.ownerJid || instance?.instance?.owner || instance?.instance?.wuid || instance?.owner || instance?.number || null;
      if (phoneNumber?.includes("@")) phoneNumber = phoneNumber.split("@")[0];

      // Extract error / disconnection info
      const disconnectionObj = instance?.disconnectionObject || instance?.instance?.disconnectionObject;
      if (disconnectionObj) {
        disconnectionReason = disconnectionObj?.message || disconnectionObj?.reason || JSON.stringify(disconnectionObj);
      }
      if (instance?.error) {
        instanceError = typeof instance.error === "string" ? instance.error : JSON.stringify(instance.error);
      }
    } catch (e) {
      console.warn(`[WHATSAPP_QR] FETCH_INSTANCES_FAILED error=${e.message}`);
    }

    // 3. Determine final mapped status — prefer fetchInstances connectionStatus for LOGOUT detection
    const isLogout = isLogoutState(evolutionState, instanceConnectionStatus);
    let mappedStatus = isLogout ? "disconnected" : mapEvolutionState(evolutionState);

    const errorMessage = disconnectionReason || instanceError || null;

    console.log(`[WHATSAPP_QR] STATUS_CHECK instance=${instanceName} evolution=${evolutionState} connectionStatus=${instanceConnectionStatus} isLogout=${isLogout} mapped=${mappedStatus} error=${errorMessage}`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    const { data: existingConn } = await adminClient
      .from("whatsapp_qr_connections")
      .select("recovery_state, recovery_attempt_count")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Query message activity
    let lastInboundAt: string | null = null;
    let lastOutboundAt: string | null = null;
    try {
      const { data: lastInbound } = await adminClient.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "inbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastInboundAt = lastInbound?.sent_at || null;
      const { data: lastOutbound } = await adminClient.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "outbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastOutboundAt = lastOutbound?.sent_at || null;
    } catch (e) {
      console.warn(`[WHATSAPP_QR] MSG_ACTIVITY_QUERY_FAILED error=${e.message}`);
    }

    const connectedAt = mappedStatus === "connected" ? new Date().toISOString() : null;
    const lastSeenAt = new Date().toISOString();
    const now = new Date().toISOString();

    // For logout/not_connection: force sync_health and recovery_state
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
      const healthResult = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt, connectedAt, lastSeenAt);
      sync_health = healthResult.sync_health;
      sync_issue_reason = healthResult.sync_issue_reason;
      const recoveryResult = reconcileRecoveryState(
        sync_health,
        existingConn?.recovery_state || "none",
        existingConn?.recovery_attempt_count || 0,
      );
      recovery_state = recoveryResult.recovery_state;
      recovery_attempt_count = recoveryResult.recovery_attempt_count;
    }

    console.log(`[WHATSAPP_QR] HEALTH_INFERRED connection=${mappedStatus} sync_health=${sync_health} recovery_state=${recovery_state} reason=${sync_issue_reason}`);

    const updatePayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      instance_name: instanceName,
      status: mappedStatus,
      sync_health,
      sync_issue_reason,
      recovery_state,
      recovery_attempt_count,
      last_health_check_at: now,
      last_seen_at: now,
      updated_at: now,
    };

    if (lastInboundAt) updatePayload.last_inbound_message_at = lastInboundAt;
    if (lastOutboundAt) updatePayload.last_outbound_message_at = lastOutboundAt;
    if (sync_health === "active") updatePayload.last_successful_sync_at = now;

    if (mappedStatus === "connected") {
      updatePayload.connected_at = now;
      updatePayload.phone_number = phoneNumber;
      updatePayload.last_error = null;
      updatePayload.disconnected_at = null;
    } else if (mappedStatus === "disconnected") {
      updatePayload.disconnected_at = now;
      updatePayload.last_error = errorMessage;
    }

    await adminClient.from("whatsapp_qr_connections").upsert(updatePayload, { onConflict: "workspace_id" });

    if (mappedStatus === "connected") {
      await adminClient.from("whatsapp_connections").upsert({
        workspace_id: workspaceId,
        is_active: true,
        display_phone_number: phoneNumber,
        connected_by: userId,
        updated_at: now,
      }, { onConflict: "workspace_id" });
    } else if (isLogout) {
      // Mark whatsapp_connections as inactive on logout
      await adminClient.from("whatsapp_connections").update({ is_active: false, updated_at: now })
        .eq("workspace_id", workspaceId);
    }

    return jsonRes({
      connected: mappedStatus === "connected",
      status: mappedStatus,
      connection_state: mappedStatus,
      sync_health,
      sync_issue_reason,
      recovery_state,
      recovery_attempt_count,
      phoneNumber,
      state: evolutionState,
      connectionStatus: instanceConnectionStatus,
      last_error: errorMessage,
      last_health_check_at: now,
      last_inbound_message_at: lastInboundAt,
      last_outbound_message_at: lastOutboundAt,
    });
  } catch (error) {
    console.error("[WHATSAPP_QR] STATUS_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
