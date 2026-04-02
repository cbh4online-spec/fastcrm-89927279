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

function api(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
}

function mapState(state: string | undefined): string {
  switch (state) {
    case "open": return "connected";
    case "close": return "disconnected";
    case "connecting": return "waiting_for_scan";
    default: return "disconnected";
  }
}

function inferSyncHealth(
  status: string,
  lastInboundAt: string | null,
  lastOutboundAt: string | null,
): { sync_health: string; sync_issue_reason: string | null } {
  if (status !== "connected") return { sync_health: "failed", sync_issue_reason: "Sessão não conectada" };
  const now = Date.now();
  if (lastInboundAt) {
    const age = now - new Date(lastInboundAt).getTime();
    if (age < 30 * 60_000) return { sync_health: "active", sync_issue_reason: null };
    if (age < 2 * 3600_000) return { sync_health: "delayed", sync_issue_reason: `Sem mensagens há ${Math.round(age / 60000)} min` };
    return { sync_health: "suspended", sync_issue_reason: `Sem mensagens inbound há ${Math.round(age / 3600000)}h` };
  }
  if (lastOutboundAt) {
    const age = now - new Date(lastOutboundAt).getTime();
    if (age < 2 * 3600_000) return { sync_health: "active", sync_issue_reason: null };
    return { sync_health: "delayed", sync_issue_reason: "Sem actividade recente" };
  }
  return { sync_health: "unknown", sync_issue_reason: "Sem dados de actividade" };
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
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const instanceName = `ws_${workspaceId.replace(/-/g, "").substring(0, 16)}`;
    console.log(`[WA_SYNC] START ws=${workspaceId} instance=${instanceName}`);

    // Get existing record
    const { data: existingConn } = await admin
      .from("whatsapp_qr_connections")
      .select("recovery_state, recovery_attempt_count")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    // Check Evolution state
    let evolutionState: string | null = null;
    let phoneNumber: string | null = null;
    try {
      const stateRes = await api(`${baseUrl}/instance/connectionState/${instanceName}`, {
        method: "GET", headers: { apikey: EVOLUTION_API_KEY },
      });
      if (stateRes.ok) {
        const sd = await stateRes.json();
        evolutionState = sd?.instance?.state || null;
      } else { await stateRes.text(); }
    } catch { evolutionState = null; }

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

    const mappedStatus = mapState(evolutionState);

    // Get phone if connected
    if (mappedStatus === "connected") {
      try {
        const infoRes = await api(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET", headers: { apikey: EVOLUTION_API_KEY },
        });
        const infoData = await infoRes.json();
        const inst = Array.isArray(infoData) ? infoData[0] : infoData;
        phoneNumber = inst?.ownerJid || inst?.instance?.owner || inst?.instance?.wuid || null;
        if (phoneNumber?.includes("@")) phoneNumber = phoneNumber.split("@")[0];
      } catch { /* ignore */ }
    }

    // Query message activity
    let lastInboundAt: string | null = null;
    let lastOutboundAt: string | null = null;
    try {
      const { data: li } = await admin.from("messages").select("sent_at")
        .eq("workspace_id", workspaceId).eq("direction", "inbound")
        .order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastInboundAt = li?.sent_at || null;
      const { data: lo } = await admin.from("messages").select("sent_at")
        .eq("workspace_id", workspaceId).eq("direction", "outbound")
        .order("sent_at", { ascending: false }).limit(1).maybeSingle();
      lastOutboundAt = lo?.sent_at || null;
    } catch { /* ignore */ }

    const { sync_health, sync_issue_reason } = inferSyncHealth(mappedStatus, lastInboundAt, lastOutboundAt);

    // Reconcile recovery
    let recovery_state = existingConn?.recovery_state || "none";
    let recovery_attempt_count = existingConn?.recovery_attempt_count || 0;
    if (sync_health === "active") { recovery_state = "none"; recovery_attempt_count = 0; }
    else if (recovery_attempt_count >= 3 && (sync_health === "suspended" || sync_health === "failed")) {
      recovery_state = "repair_required";
    }

    // Ensure webhook is set
    const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-evolution-webhook`;
    try {
      await api(`${baseUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({
          url: webhookUrl, enabled: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
          webhook_by_events: false, webhook_base64: false,
        }),
      });
      console.log(`[WA_SYNC] WEBHOOK_SET url=${webhookUrl}`);
    } catch (e) {
      console.warn(`[WA_SYNC] WEBHOOK_SET_FAILED`, e);
    }

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

    // Sync whatsapp_connections
    if (mappedStatus === "connected") {
      await admin.from("whatsapp_connections").upsert({
        workspace_id: workspaceId, is_active: true, display_phone_number: phoneNumber, updated_at: now,
      }, { onConflict: "workspace_id" });
    } else {
      await admin.from("whatsapp_connections").update({ is_active: false, updated_at: now })
        .eq("workspace_id", workspaceId);
    }

    console.log(`[WA_SYNC] DONE ws=${workspaceId} status=${mappedStatus} health=${sync_health} recovery=${recovery_state}`);
    return jsonRes({
      status: mappedStatus, sync_health, sync_issue_reason, recovery_state,
      recovery_attempt_count, phoneNumber, synced: true,
    });
  } catch (error) {
    console.error("[WA_SYNC] ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
