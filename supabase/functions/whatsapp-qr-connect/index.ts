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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspaceId, userId } = await req.json();
    if (!workspaceId || !userId) return jsonRes({ error: "Missing workspaceId or userId" }, 400);

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return jsonRes({ error: "Evolution API not configured. Add EVOLUTION_API_URL and EVOLUTION_API_KEY secrets." }, 500);
    }

    // Sanitize URL — extract origin only
    let finalUrl = EVOLUTION_API_URL.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      if (finalUrl.includes("://")) {
        console.error(`[WHATSAPP_QR] INVALID_URL scheme="${finalUrl.substring(0, 15)}"`);
        return jsonRes({ error: "EVOLUTION_API_URL must be an HTTP(S) URL." }, 500);
      }
      finalUrl = `https://${finalUrl}`;
    }
    const baseUrl = new URL(finalUrl).origin;

    // Deterministic instance name
    const instanceName = `ws_${workspaceId.replace(/-/g, "").substring(0, 16)}`;
    console.log(`[WHATSAPP_QR] START workspace=${workspaceId} instance=${instanceName}`);

    // Supabase admin client for DB ops
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert status → creating_instance
    await adminClient.from("whatsapp_qr_connections").upsert(
      {
        workspace_id: workspaceId,
        instance_name: instanceName,
        status: "creating_instance",
        last_error: null,
        qr_code: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" }
    );

    // 1. Create instance (idempotent)
    let instanceCreated = false;
    try {
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      });
      const createText = await createRes.text();
      console.log(`[WHATSAPP_QR] CREATE status=${createRes.status} body=${createText.substring(0, 200)}`);

      if (createRes.status === 401) {
        await adminClient.from("whatsapp_qr_connections").update({
          status: "error", last_error: "EVOLUTION_API_KEY inválida",
        }).eq("workspace_id", workspaceId);
        return jsonRes({ error: "EVOLUTION_API_KEY inválida — verifique a configuração." }, 401);
      }

      // 2xx created, 409/403 already exists — all OK
      instanceCreated = createRes.ok || createRes.status === 409 || createRes.status === 403;
    } catch (e) {
      console.error(`[WHATSAPP_QR] CREATE_FAILED error=${e.message}`);
    }

    if (!instanceCreated) {
      await adminClient.from("whatsapp_qr_connections").update({
        status: "error", last_error: "Falha ao criar instância na Evolution API",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: "Falha ao criar instância na Evolution API." }, 500);
    }

    console.log(`[WHATSAPP_QR] INSTANCE_READY instance=${instanceName}`);

    // 2. Connect and get QR
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });
    const connectData = await connectRes.json();

    if (!connectRes.ok) {
      console.error(`[WHATSAPP_QR] CONNECT_FAILED status=${connectRes.status}`, connectData);
      await adminClient.from("whatsapp_qr_connections").update({
        status: "error", last_error: connectData?.message || "Failed to connect instance",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: connectData?.message || "Failed to connect instance" }, 500);
    }

    const qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || null;

    if (!qrcode) {
      // Already connected
      if (connectData?.instance?.state === "open") {
        console.log(`[WHATSAPP_QR] ALREADY_CONNECTED instance=${instanceName}`);
        await adminClient.from("whatsapp_qr_connections").update({
          status: "connected", connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
        }).eq("workspace_id", workspaceId);
        return jsonRes({ alreadyConnected: true, instanceName, status: "connected" });
      }
      await adminClient.from("whatsapp_qr_connections").update({
        status: "error", last_error: "QR code not available",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: "QR code not available. Try again." }, 500);
    }

    // Save QR to DB
    console.log(`[WHATSAPP_QR] QR_GENERATED instance=${instanceName}`);
    await adminClient.from("whatsapp_qr_connections").update({
      status: "qr_pending",
      qr_code: qrcode,
      qr_updated_at: new Date().toISOString(),
      last_error: null,
    }).eq("workspace_id", workspaceId);

    return jsonRes({ qrcode, instanceName, status: "qr_pending" });
  } catch (error) {
    console.error("[WHATSAPP_QR] UNHANDLED_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
