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
    default: return "disconnected";
  }
}

function inferSyncHealth(
  connectionStatus: string,
  lastInboundAt: string | null,
  lastOutboundAt: string | null,
): { sync_health: string; sync_issue_reason: string | null } {
  if (connectionStatus !== "connected") {
    return { sync_health: "failed", sync_issue_reason: "Sessão WhatsApp não está conectada" };
  }
  const now = Date.now();
  if (lastInboundAt) {
    const inboundAge = now - new Date(lastInboundAt).getTime();
    const thirtyMin = 30 * 60 * 1000;
    const twoHours = 2 * 60 * 60 * 1000;
    if (inboundAge < thirtyMin) return { sync_health: "active", sync_issue_reason: null };
    if (inboundAge < twoHours) return { sync_health: "delayed", sync_issue_reason: `Sem mensagens inbound há ${Math.round(inboundAge / 60000)} minutos` };
    return { sync_health: "suspended", sync_issue_reason: `Sem mensagens inbound há mais de ${Math.round(inboundAge / 3600000)} horas. O sync do histórico pode estar suspenso no dispositivo.` };
  }
  if (lastOutboundAt) {
    const outboundAge = now - new Date(lastOutboundAt).getTime();
    if (outboundAge < 2 * 60 * 60 * 1000) return { sync_health: "active", sync_issue_reason: null };
    return { sync_health: "delayed", sync_issue_reason: "Sem actividade recente de mensagens" };
  }
  return { sync_health: "unknown", sync_issue_reason: "Sem dados de actividade para inferir saúde de sincronização" };
}

/** Determine recovery_state based on sync_health and attempt count */
function determineRecoveryState(syncHealth: string, attemptCount: number, currentRecoveryState: string): string {
  if (syncHealth === "active") return "none";
  if (attemptCount >= 3 && (syncHealth === "suspended" || syncHealth === "failed" || syncHealth === "degraded")) {
    return "repair_required";
  }
  // Keep current transitional state if still in progress
  if (currentRecoveryState === "reconnecting") return "reconnecting";
  return currentRecoveryState;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId } = await req.json();
    if (!workspaceId) return jsonRes({ error: "Missing workspaceId" }, 400);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return jsonRes({ error: "Evolution API not configured" }, 500);

    let finalUrl = EVOLUTION_API_URL.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) finalUrl = `https://${finalUrl}`;
    const baseUrl = new URL(finalUrl).origin;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get current connection record
    const { data: conn, error: connErr } = await adminClient
      .from("whatsapp_qr_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (connErr || !conn) return jsonRes({ error: "No WhatsApp connection found for this workspace" }, 404);

    const instanceName = conn.instance_name;
    const currentAttempts = (conn.recovery_attempt_count || 0) + 1;
    const now = new Date().toISOString();

    console.log(`[WHATSAPP_RECOVERY] RECONNECT_STARTED workspace=${workspaceId} instance=${instanceName} attempt=${currentAttempts}`);

    // 2. Mark recovery state as reconnecting
    await adminClient.from("whatsapp_qr_connections").update({
      recovery_state: "reconnecting",
      recovery_attempt_count: currentAttempts,
      recovery_last_attempt_at: now,
      updated_at: now,
    }).eq("workspace_id", workspaceId);

    // 3. Attempt soft restart via Evolution API
    let restartSuccess = false;
    try {
      const restartRes = await fetch(`${baseUrl}/instance/restart/${instanceName}`, {
        method: "PUT",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      });
      if (restartRes.ok) {
        restartSuccess = true;
        console.log(`[WHATSAPP_RECOVERY] RESTART_SUCCESS instance=${instanceName}`);
      } else {
        const restartErr = await restartRes.text();
        console.warn(`[WHATSAPP_RECOVERY] RESTART_FAILED instance=${instanceName} status=${restartRes.status} body=${restartErr}`);
      }
    } catch (e) {
      console.warn(`[WHATSAPP_RECOVERY] RESTART_ERROR instance=${instanceName} error=${e.message}`);
    }

    // 4. If restart failed, try connect endpoint
    if (!restartSuccess) {
      try {
        const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        if (connectRes.ok) {
          console.log(`[WHATSAPP_RECOVERY] CONNECT_FALLBACK_SUCCESS instance=${instanceName}`);
        } else {
          console.warn(`[WHATSAPP_RECOVERY] CONNECT_FALLBACK_FAILED instance=${instanceName} status=${connectRes.status}`);
        }
      } catch (e) {
        console.warn(`[WHATSAPP_RECOVERY] CONNECT_FALLBACK_ERROR instance=${instanceName} error=${e.message}`);
      }
    }

    // 5. Wait briefly then re-check state
    await new Promise((r) => setTimeout(r, 3000));

    let evolutionState: string | null = null;
    let phoneNumber: string | null = null;
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        evolutionState = stateData?.instance?.state || null;
      }
    } catch { /* ignore */ }

    const mappedStatus = evolutionState ? mapEvolutionState(evolutionState) : "disconnected";

    // Get phone if connected
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
      } catch { /* ignore */ }
    }

    // 6. Query message activity for sync health
    let lastInboundAt: string | null = null;
    let lastOutboundAt: string | null = null;
    try {
      const { data: lastInbound } = await adminClient.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "inbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastInboundAt = lastInbound?.sent_at || null;
      const { data: lastOutbound } = await adminClient.from("messages").select("sent_at").eq("workspace_id", workspaceId).eq("direction", "outbound").order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastOutboundAt = lastOutbound?.sent_at || null;
    } catch { /* ignore */ }

    const { sync_health, sync_issue_reason } = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt);
    const recoveryState = determineRecoveryState(sync_health, currentAttempts, "reconnecting");

    console.log(`[WHATSAPP_RECOVERY] RECONNECT_RESULT workspace=${workspaceId} connection=${mappedStatus} sync_health=${sync_health} recovery_state=${recoveryState} attempts=${currentAttempts}`);

    // 7. Persist final state
    const updatePayload: Record<string, unknown> = {
      status: mappedStatus,
      sync_health,
      sync_issue_reason,
      recovery_state: recoveryState,
      recovery_attempt_count: sync_health === "active" ? 0 : currentAttempts,
      recovery_last_attempt_at: now,
      last_health_check_at: now,
      last_reconnect_at: now,
      last_seen_at: now,
      updated_at: now,
    };

    if (lastInboundAt) updatePayload.last_inbound_message_at = lastInboundAt;
    if (lastOutboundAt) updatePayload.last_outbound_message_at = lastOutboundAt;
    if (sync_health === "active") {
      updatePayload.last_successful_sync_at = now;
      updatePayload.recovery_attempt_count = 0;
    }
    if (mappedStatus === "connected") {
      updatePayload.connected_at = now;
      updatePayload.phone_number = phoneNumber;
      updatePayload.last_error = null;
      updatePayload.disconnected_at = null;
    } else if (mappedStatus === "disconnected") {
      updatePayload.disconnected_at = now;
    }

    await adminClient.from("whatsapp_qr_connections").update(updatePayload).eq("workspace_id", workspaceId);

    // Sync whatsapp_connections
    if (mappedStatus === "connected") {
      await adminClient.from("whatsapp_connections").upsert({
        workspace_id: workspaceId,
        is_active: true,
        display_phone_number: phoneNumber,
        updated_at: now,
      }, { onConflict: "workspace_id" });
    }

    const succeeded = sync_health === "active";
    if (succeeded) {
      console.log(`[WHATSAPP_RECOVERY] RECONNECT_SUCCEEDED workspace=${workspaceId}`);
    } else if (recoveryState === "repair_required") {
      console.log(`[WHATSAPP_RECOVERY] REPAIR_REQUIRED workspace=${workspaceId} attempts=${currentAttempts}`);
    } else {
      console.log(`[WHATSAPP_RECOVERY] RECONNECT_PARTIAL workspace=${workspaceId} sync_health=${sync_health}`);
    }

    return jsonRes({
      success: succeeded,
      connection_state: mappedStatus,
      sync_health,
      sync_issue_reason,
      recovery_state: recoveryState,
      recovery_attempt_count: sync_health === "active" ? 0 : currentAttempts,
      phoneNumber,
      last_health_check_at: now,
    });
  } catch (error) {
    console.error("[WHATSAPP_RECOVERY] RECONNECT_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
