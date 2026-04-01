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

/** Map Evolution API state to our internal status */
function mapEvolutionState(state: string | undefined): string {
  switch (state) {
    case "open": return "connected";
    case "close": return "disconnected";
    case "connecting": return "waiting_for_scan";
    default: return "error";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId, instanceName } = await req.json();
    if (!workspaceId || !instanceName) return jsonRes({ error: "Missing workspaceId or instanceName" }, 400);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return jsonRes({ error: "Evolution API not configured" }, 500);

    // Sanitize URL
    let finalUrl = EVOLUTION_API_URL.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }
    const baseUrl = new URL(finalUrl).origin;

    // 1. Check connection state
    const statusRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });
    const statusData = await statusRes.json();
    const evolutionState = statusData?.instance?.state;
    const mappedStatus = mapEvolutionState(evolutionState);

    console.log(`[WHATSAPP_QR] STATUS_CHECK instance=${instanceName} evolution=${evolutionState} mapped=${mappedStatus}`);

    // 2. Supabase admin client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // 3. Get phone number if connected
    let phoneNumber: string | null = null;
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

    // 4. Upsert whatsapp_qr_connections
    const now = new Date().toISOString();
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
      updatePayload.disconnected_at = null;
    } else if (mappedStatus === "disconnected") {
      updatePayload.disconnected_at = now;
    }

    await adminClient.from("whatsapp_qr_connections").upsert(updatePayload, { onConflict: "workspace_id" });

    // 5. If connected, also sync to whatsapp_connections for inbox compatibility
    if (mappedStatus === "connected") {
      console.log(`[WHATSAPP_QR] CONNECTED instance=${instanceName} phone=${phoneNumber}`);
      await adminClient.from("whatsapp_connections").upsert(
        {
          workspace_id: workspaceId,
          is_active: true,
          display_phone_number: phoneNumber,
          connected_by: userId,
          updated_at: now,
        },
        { onConflict: "workspace_id" }
      );
    }

    return jsonRes({
      connected: mappedStatus === "connected",
      status: mappedStatus,
      phoneNumber,
      state: evolutionState,
    });
  } catch (error) {
    console.error("[WHATSAPP_QR] STATUS_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
