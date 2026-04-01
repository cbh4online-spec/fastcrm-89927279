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

/** Infer sync health based on connection state and message activity */
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

    if (inboundAge < thirtyMin) {
      return { sync_health: "active", sync_issue_reason: null };
    }
    if (inboundAge < twoHours) {
      return { sync_health: "delayed", sync_issue_reason: `Sem mensagens inbound há ${Math.round(inboundAge / 60000)} minutos` };
    }
    return { sync_health: "suspended", sync_issue_reason: `Sem mensagens inbound há mais de ${Math.round(inboundAge / 3600000)} horas. O sync do histórico pode estar suspenso no dispositivo.` };
  }

  if (lastOutboundAt) {
    const outboundAge = now - new Date(lastOutboundAt).getTime();
    const twoHours = 2 * 60 * 60 * 1000;
    if (outboundAge < twoHours) {
      return { sync_health: "active", sync_issue_reason: null };
    }
    return { sync_health: "delayed", sync_issue_reason: "Sem actividade recente de mensagens" };
  }

  return { sync_health: "unknown", sync_issue_reason: "Sem dados de actividade para inferir saúde de sincronização" };
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
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }
    const baseUrl = new URL(finalUrl).origin;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const instanceName = `ws_${workspaceId.replace(/-/g, "").substring(0, 16)}`;
    console.log(`[WHATSAPP_QR] SYNC_START workspace=${workspaceId} instance=${instanceName}`);

    // 1. Check if instance exists in Evolution API
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
      } else {
        await stateRes.text();
        evolutionState = null;
      }
    } catch {
      evolutionState = null;
    }

    const now = new Date().toISOString();

    if (!evolutionState) {
      console.log(`[WHATSAPP_QR] SYNC instance=${instanceName} not_found_in_evolution`);
      await adminClient.from("whatsapp_qr_connections").upsert({
        workspace_id: workspaceId,
        instance_name: instanceName,
        status: "not_configured",
        sync_health: "unknown",
        sync_issue_reason: "Instância não encontrada na Evolution API",
        last_health_check_at: now,
        qr_code: null,
        phone_number: null,
        last_seen_at: now,
        updated_at: now,
      }, { onConflict: "workspace_id" });

      return jsonRes({ status: "not_configured", sync_health: "unknown", synced: true });
    }

    const mappedStatus = mapEvolutionState(evolutionState);

    // Get phone number if connected
    if (mappedStatus === "connected") {
      try {
        const infoRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const infoData = await infoRes.json();
        console.log(`[WHATSAPP_QR] FETCH_INSTANCES raw=${JSON.stringify(infoData).substring(0, 500)}`);
        const instance = Array.isArray(infoData) ? infoData[0] : infoData;
        phoneNumber = instance?.ownerJid
          || instance?.instance?.owner
          || instance?.instance?.wuid
          || instance?.owner
          || instance?.number
          || null;
        if (phoneNumber && phoneNumber.includes("@")) {
          phoneNumber = phoneNumber.split("@")[0];
        }
        console.log(`[WHATSAPP_QR] PHONE_EXTRACTED phone=${phoneNumber}`);
      } catch (e) {
        console.warn(`[WHATSAPP_QR] FETCH_INSTANCES_FAILED error=${e.message}`);
      }
    }

    // Query last message activity for sync health inference
    let lastInboundAt: string | null = null;
    let lastOutboundAt: string | null = null;

    try {
      const { data: lastInbound } = await adminClient
        .from("messages")
        .select("sent_at")
        .eq("workspace_id", workspaceId)
        .eq("direction", "inbound")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastInboundAt = lastInbound?.sent_at || null;

      const { data: lastOutbound } = await adminClient
        .from("messages")
        .select("sent_at")
        .eq("workspace_id", workspaceId)
        .eq("direction", "outbound")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      lastOutboundAt = lastOutbound?.sent_at || null;
    } catch (e) {
      console.warn(`[WHATSAPP_QR] MSG_ACTIVITY_QUERY_FAILED error=${e.message}`);
    }

    // Infer sync health
    const { sync_health, sync_issue_reason } = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt);

    console.log(`[WHATSAPP_QR] HEALTH_INFERRED connection=${mappedStatus} sync_health=${sync_health} reason=${sync_issue_reason}`);

    // Upsert state
    const updatePayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      instance_name: instanceName,
      status: mappedStatus,
      sync_health,
      sync_issue_reason,
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
    } else if (mappedStatus === "disconnected") {
      updatePayload.disconnected_at = now;
    }

    await adminClient.from("whatsapp_qr_connections").upsert(updatePayload, { onConflict: "workspace_id" });

    // Sync whatsapp_connections
    if (mappedStatus === "connected") {
      await adminClient.from("whatsapp_connections").upsert({
        workspace_id: workspaceId,
        is_active: true,
        display_phone_number: phoneNumber,
        updated_at: now,
      }, { onConflict: "workspace_id" });
    } else {
      await adminClient.from("whatsapp_connections").update({
        is_active: false,
        updated_at: now,
      }).eq("workspace_id", workspaceId);
    }

    console.log(`[WHATSAPP_QR] SYNC_DONE workspace=${workspaceId} status=${mappedStatus} sync_health=${sync_health} phone=${phoneNumber}`);
    return jsonRes({
      status: mappedStatus,
      connection_state: mappedStatus,
      sync_health,
      sync_issue_reason,
      phoneNumber,
      synced: true,
      last_health_check_at: now,
      last_inbound_message_at: lastInboundAt,
      last_outbound_message_at: lastOutboundAt,
    });
  } catch (error) {
    console.error("[WHATSAPP_QR] SYNC_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
