import {
  corsHeaders, jsonRes, evoFetch, getAdminClient, getEvolutionConfig,
  validateAuth, validateWorkspaceMembership, instanceNameFor, getWebhookUrl,
} from "../_shared/evolution-api.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Auth
    const auth = await validateAuth(req);
    if (auth.error) return auth.error;

    const body = await req.json();
    const workspaceId = body?.workspaceId;
    if (!workspaceId || typeof workspaceId !== "string") return jsonRes({ error: "Missing workspaceId" }, 400);

    const membership = await validateWorkspaceMembership(auth.userId, workspaceId);
    if (membership.error) return membership.error;

    // 2. Config
    const evo = getEvolutionConfig();
    if ("error" in evo) return evo.error;
    const { baseUrl, apiKey } = evo;
    const { admin, supabaseUrl } = getAdminClient();
    const instanceName = instanceNameFor(workspaceId);
    const webhookUrl = getWebhookUrl();

    console.log(`[WHATSAPP_QR] CONNECT_START workspace=${workspaceId} instance=${instanceName}`);

    // 3. Set status → creating_instance
    await admin.from("whatsapp_qr_connections").upsert({
      workspace_id: workspaceId,
      instance_name: instanceName,
      status: "creating_instance",
      last_error: null,
      qr_code: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" });

    // 4. Create instance (idempotent)
    const createPayload = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        url: webhookUrl, enabled: true,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        webhook_by_events: false, webhook_base64: false,
      },
    };

    const createRes = await evoFetch(baseUrl, "/instance/create", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPayload),
    });

    console.log(`[WHATSAPP_QR] CREATE status=${createRes.status} body=${createRes.text}`);

    if (createRes.status === 401) {
      await admin.from("whatsapp_qr_connections").update({
        status: "error", last_error: "EVOLUTION_API_KEY inválida",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: "EVOLUTION_API_KEY inválida — verifique a configuração." }, 401);
    }

    const instanceCreated = createRes.ok || createRes.status === 409 || createRes.status === 403;

    // If already exists, set webhook
    if (createRes.status === 403 || createRes.status === 409) {
      await evoFetch(baseUrl, `/webhook/set/${instanceName}`, apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl, enabled: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
            webhook_by_events: false, webhook_base64: false,
          },
        }),
      });
    }

    if (!instanceCreated) {
      await admin.from("whatsapp_qr_connections").update({
        status: "error", last_error: "Falha ao criar instância na Evolution API",
      }).eq("workspace_id", workspaceId);
      return jsonRes({ error: "Falha ao criar instância na Evolution API." }, 200);
    }

    // 5. Connect and get QR
    const connectRes = await evoFetch(baseUrl, `/instance/connect/${instanceName}`, apiKey, { method: "GET" });
    console.log(`[WHATSAPP_QR] CONNECT status=${connectRes.status} body=${connectRes.text}`);

    if (!connectRes.ok) {
      // Don't escalate here — save pending_action for status to pick up
      const now = new Date().toISOString();
      await admin.from("whatsapp_qr_connections").update({
        status: "creating_instance",
        last_error: connectRes.data?.message || "Connect failed — retrying via status",
        metadata_json: { pending_action: "restart_and_connect", retry_after: now },
        updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ status: "creating_instance", instanceName, preparing: true });
    }

    const qrcode = connectRes.data?.base64 || connectRes.data?.qrcode?.base64 || connectRes.data?.code || null;

    if (qrcode) {
      const now = new Date().toISOString();
      await admin.from("whatsapp_qr_connections").update({
        status: "qr_pending", qr_code: qrcode, qr_updated_at: now,
        last_error: null, metadata_json: {}, updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ qrcode, instanceName, status: "qr_pending" });
    }

    // No QR — check if already connected
    const detectedState = connectRes.data?.instance?.state || connectRes.data?.state || connectRes.data?.status;
    if (detectedState === "open" || detectedState === "connected") {
      const now = new Date().toISOString();
      await admin.from("whatsapp_qr_connections").update({
        status: "connected", connected_at: now, last_seen_at: now,
        metadata_json: {}, updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ alreadyConnected: true, instanceName, status: "connected" });
    }

    // Stuck state — save pending_action for async recovery via status polling
    if (detectedState === "connecting" || !detectedState) {
      const now = new Date().toISOString();
      await admin.from("whatsapp_qr_connections").update({
        status: "creating_instance",
        metadata_json: { pending_action: "restart_and_connect", retry_after: now },
        updated_at: now,
      }).eq("workspace_id", workspaceId);
      console.log(`[WHATSAPP_QR] DEFERRED_RECOVERY instance=${instanceName} state=${detectedState}`);
      return jsonRes({ status: "creating_instance", instanceName, preparing: true });
    }

    return jsonRes({ error: "QR code não disponível. Tente desconectar e reconectar.", needsReconnect: true, instanceName });
  } catch (error) {
    console.error("[WHATSAPP_QR] CONNECT_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
