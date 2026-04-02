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
  switch (state) {
    case "open": return "connected";
    case "close": return "disconnected";
    case "connecting": return "waiting_for_scan";
    default: return "error";
  }
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

  // Check message-based health first
  if (lastInboundAt) {
    const inboundAge = now - new Date(lastInboundAt).getTime();
    const thirtyMin = 30 * 60 * 1000;
    const twoHours = 2 * 60 * 60 * 1000;
    if (inboundAge < thirtyMin) return { sync_health: "active", sync_issue_reason: null };
    if (inboundAge < twoHours) return { sync_health: "delayed", sync_issue_reason: `Sem mensagens inbound há ${Math.round(inboundAge / 60000)} minutos` };
    // Inbound is old — but if connection is recent, still active
  }

  // Connection is alive — check if connected_at or last_seen_at is recent
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

/** Reconcile recovery_state based on sync health and existing attempts */
function reconcileRecoveryState(
  syncHealth: string,
  currentRecoveryState: string,
  attemptCount: number,
): { recovery_state: string; recovery_attempt_count: number } {
  // Healthy → reset recovery
  if (syncHealth === "active") {
    return { recovery_state: "none", recovery_attempt_count: 0 };
  }
  // If repair already required, keep it
  if (currentRecoveryState === "repair_required") {
    return { recovery_state: "repair_required", recovery_attempt_count: attemptCount };
  }
  // Escalate if too many attempts
  if (attemptCount >= 3 && (syncHealth === "suspended" || syncHealth === "failed" || syncHealth === "degraded")) {
    return { recovery_state: "repair_required", recovery_attempt_count: attemptCount };
  }
  // Otherwise keep current state
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

    const statusRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });
    const statusData = await statusRes.json();
    const evolutionState = statusData?.instance?.state;
    const mappedStatus = mapEvolutionState(evolutionState);

    console.log(`[WHATSAPP_QR] STATUS_CHECK instance=${instanceName} evolution=${evolutionState} mapped=${mappedStatus}`);

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

    // Get current record for recovery state
    const { data: existingConn } = await adminClient
      .from("whatsapp_qr_connections")
      .select("recovery_state, recovery_attempt_count")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let phoneNumber: string | null = null;
    if (mappedStatus === "connected") {
      try {
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const infoData = await infoRes.json();
        const instance = Array.isArray(infoData) ? infoData[0] : infoData;
        phoneNumber = instance?.ownerJid || instance?.instance?.owner || instance?.instance?.wuid || instance?.owner || instance?.number || null;
        if (phoneNumber?.includes("@")) phoneNumber = phoneNumber.split("@")[0];
      } catch (e) {
        console.warn(`[WHATSAPP_QR] FETCH_INSTANCES_FAILED error=${e.message}`);
      }
    }

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

    const { sync_health, sync_issue_reason } = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt);
    const now = new Date().toISOString();

    // Reconcile recovery state
    const { recovery_state, recovery_attempt_count } = reconcileRecoveryState(
      sync_health,
      existingConn?.recovery_state || "none",
      existingConn?.recovery_attempt_count || 0,
    );

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
      last_health_check_at: now,
      last_inbound_message_at: lastInboundAt,
      last_outbound_message_at: lastOutboundAt,
    });
  } catch (error) {
    console.error("[WHATSAPP_QR] STATUS_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
