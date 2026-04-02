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

// Wrapper with 8s timeout to prevent hanging on Evolution API calls
function api(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
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
      const createRes = await api(`${baseUrl}/instance/create`, {
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
    const connectRes = await api(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
    });
    const connectData = await connectRes.json();
    console.log(`[WHATSAPP_QR] CONNECT_RESPONSE status=${connectRes.status} body=${JSON.stringify(connectData).substring(0, 500)}`);

    if (!connectRes.ok) {
      console.error(`[WHATSAPP_QR] CONNECT_FAILED status=${connectRes.status}`, connectData);
      await adminClient.from("whatsapp_qr_connections").update({
        status: "error", last_error: connectData?.message || "Failed to connect instance",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: connectData?.message || "Failed to connect instance" }, 500);
    }

    const qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || null;

    if (!qrcode) {
      // Check state from multiple possible response formats
      const detectedState = connectData?.instance?.state
        || connectData?.state
        || connectData?.status;

      if (detectedState === "open" || detectedState === "connected") {
        console.log(`[WHATSAPP_QR] ALREADY_CONNECTED instance=${instanceName} state=${detectedState}`);
        await adminClient.from("whatsapp_qr_connections").update({
          status: "connected", connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
        }).eq("workspace_id", workspaceId);
        return jsonRes({ alreadyConnected: true, instanceName, status: "connected" });
      }

      // Fallback: check connectionState endpoint
      try {
        const stateRes = await api(`${baseUrl}/instance/connectionState/${instanceName}`, {
          method: "GET",
          headers: { apikey: EVOLUTION_API_KEY },
        });
        const stateData = await stateRes.json();
        console.log(`[WHATSAPP_QR] CONNECTION_STATE_FALLBACK body=${JSON.stringify(stateData).substring(0, 300)}`);
        const fallbackState = stateData?.instance?.state || stateData?.state || stateData?.status;
        if (fallbackState === "open" || fallbackState === "connected") {
          console.log(`[WHATSAPP_QR] ALREADY_CONNECTED_VIA_FALLBACK instance=${instanceName} state=${fallbackState}`);
          await adminClient.from("whatsapp_qr_connections").update({
            status: "connected", connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
          }).eq("workspace_id", workspaceId);
          return jsonRes({ alreadyConnected: true, instanceName, status: "connected" });
        }

        // If stuck in "connecting", restart instance and retry connect once
        if (fallbackState === "connecting") {
          console.log(`[WHATSAPP_QR] RESTART instance=${instanceName} (stuck in connecting)`);
          try {
            await api(`${baseUrl}/instance/restart/${instanceName}`, {
              method: "PUT",
              headers: { apikey: EVOLUTION_API_KEY },
            });
          } catch (restartErr) {
            console.error(`[WHATSAPP_QR] RESTART_FAILED`, restartErr);
          }

          // Wait 2s for restart
          await new Promise((r) => setTimeout(r, 2000));

          // Retry connect
          const retryRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
            method: "GET",
            headers: { apikey: EVOLUTION_API_KEY },
          });
          const retryData = await retryRes.json();
          console.log(`[WHATSAPP_QR] RETRY_CONNECT status=${retryRes.status} body=${JSON.stringify(retryData).substring(0, 500)}`);

          const retryQR = retryData?.base64 || retryData?.qrcode?.base64 || retryData?.code || null;
          if (retryQR) {
            console.log(`[WHATSAPP_QR] QR_GENERATED_AFTER_RESTART instance=${instanceName}`);
            await adminClient.from("whatsapp_qr_connections").update({
              status: "qr_pending", qr_code: retryQR, qr_updated_at: new Date().toISOString(), last_error: null,
            }).eq("workspace_id", workspaceId);
            return jsonRes({ qrcode: retryQR, instanceName, status: "qr_pending" });
          }

          // Check if now connected after restart
          const retryState = retryData?.instance?.state || retryData?.state || retryData?.status;
          if (retryState === "open" || retryState === "connected") {
            await adminClient.from("whatsapp_qr_connections").update({
              status: "connected", connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
            }).eq("workspace_id", workspaceId);
            return jsonRes({ alreadyConnected: true, instanceName, status: "connected" });
          }

          // Escalate: DELETE + RECREATE instance
          console.log(`[WHATSAPP_QR] DELETE instance=${instanceName} (restart did not resolve)`);
          try {
            const delRes = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
              method: "DELETE",
              headers: { apikey: EVOLUTION_API_KEY },
            });
            const delText = await delRes.text();
            console.log(`[WHATSAPP_QR] DELETE status=${delRes.status} body=${delText.substring(0, 200)}`);
          } catch (delErr) {
            console.error(`[WHATSAPP_QR] DELETE_FAILED`, delErr);
          }

          await new Promise((r) => setTimeout(r, 1000));

          // Recreate instance
          console.log(`[WHATSAPP_QR] RECREATE instance=${instanceName}`);
          try {
            const recreateRes = await fetch(`${baseUrl}/instance/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
              body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
            });
            const recreateText = await recreateRes.text();
            console.log(`[WHATSAPP_QR] RECREATE status=${recreateRes.status} body=${recreateText.substring(0, 300)}`);
          } catch (recreateErr) {
            console.error(`[WHATSAPP_QR] RECREATE_FAILED`, recreateErr);
          }

          // Connect after recreate
          const finalRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
            method: "GET",
            headers: { apikey: EVOLUTION_API_KEY },
          });
          const finalData = await finalRes.json();
          console.log(`[WHATSAPP_QR] RETRY_CONNECT_AFTER_RECREATE status=${finalRes.status} body=${JSON.stringify(finalData).substring(0, 500)}`);

          const finalQR = finalData?.base64 || finalData?.qrcode?.base64 || finalData?.code || null;
          if (finalQR) {
            console.log(`[WHATSAPP_QR] QR_GENERATED_AFTER_RECREATE instance=${instanceName}`);
            await adminClient.from("whatsapp_qr_connections").update({
              status: "qr_pending", qr_code: finalQR, qr_updated_at: new Date().toISOString(), last_error: null,
            }).eq("workspace_id", workspaceId);
            return jsonRes({ qrcode: finalQR, instanceName, status: "qr_pending" });
          }

          const finalState = finalData?.instance?.state || finalData?.state || finalData?.status;
          if (finalState === "open" || finalState === "connected") {
            await adminClient.from("whatsapp_qr_connections").update({
              status: "connected", connected_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
            }).eq("workspace_id", workspaceId);
            return jsonRes({ alreadyConnected: true, instanceName, status: "connected" });
          }
        }
      } catch (fallbackErr) {
        console.error(`[WHATSAPP_QR] CONNECTION_STATE_FALLBACK_ERROR`, fallbackErr);
      }

      // Return 200 with structured error instead of 500 (resilient pattern)
      console.warn(`[WHATSAPP_QR] NO_QR_NO_STATE instance=${instanceName}`);
      await adminClient.from("whatsapp_qr_connections").update({
        status: "error", last_error: "QR code not available",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: "QR code não disponível. Tente desconectar e reconectar.", needsReconnect: true, instanceName });
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
