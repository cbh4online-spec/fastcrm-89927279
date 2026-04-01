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
        // Instance doesn't exist in Evolution
        evolutionState = null;
      }
    } catch {
      evolutionState = null;
    }

    const now = new Date().toISOString();

    if (!evolutionState) {
      // Instance doesn't exist — mark as not_configured
      console.log(`[WHATSAPP_QR] SYNC instance=${instanceName} not_found_in_evolution`);
      await adminClient.from("whatsapp_qr_connections").upsert({
        workspace_id: workspaceId,
        instance_name: instanceName,
        status: "not_configured",
        qr_code: null,
        phone_number: null,
        last_seen_at: now,
        updated_at: now,
      }, { onConflict: "workspace_id" });

      return jsonRes({ status: "not_configured", synced: true });
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
        // Evolution API v2 returns flat objects with ownerJid
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

    // Upsert state
    const updatePayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      instance_name: instanceName,
      status: mappedStatus,
      last_seen_at: now,
      updated_at: now,
    };
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

    console.log(`[WHATSAPP_QR] SYNC_DONE workspace=${workspaceId} status=${mappedStatus} phone=${phoneNumber}`);
    return jsonRes({ status: mappedStatus, phoneNumber, synced: true });
  } catch (error) {
    console.error("[WHATSAPP_QR] SYNC_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
