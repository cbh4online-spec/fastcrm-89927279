import {
  corsHeaders, jsonRes, evoFetch, getAdminClient, getEvolutionConfig,
  validateAuth, validateWorkspaceMembership, getWebhookUrl,
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
    const { admin } = getAdminClient();
    const webhookUrl = getWebhookUrl();

    const { data: conn } = await admin
      .from("whatsapp_qr_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!conn) return jsonRes({ error: "No WhatsApp connection found" }, 404);

    const instanceName = conn.instance_name;
    const currentAttempts = ((conn as any).recovery_attempt_count || 0) + 1;
    const now = new Date().toISOString();

    console.log(`[WA_RECONNECT] START ws=${workspaceId} instance=${instanceName} attempt=${currentAttempts}`);

    // Set recovering state
    await admin.from("whatsapp_qr_connections").update({
      recovery_state: "reconnecting",
      recovery_attempt_count: currentAttempts,
      recovery_last_attempt_at: now, updated_at: now,
    }).eq("workspace_id", workspaceId);

    // Step 1: Restart
    await evoFetch(baseUrl, `/instance/restart/${instanceName}`, apiKey, { method: "PUT" });
    await new Promise((r) => setTimeout(r, 2000));

    // Check state
    const stateRes = await evoFetch(baseUrl, `/instance/connectionState/${instanceName}`, apiKey, { method: "GET" });
    const state = stateRes.data?.instance?.state || stateRes.data?.state;

    console.log(`[WA_RECONNECT] STATE_AFTER_RESTART=${state}`);

    if (state === "open" || state === "connected") {
      // Set webhook
      await evoFetch(baseUrl, `/webhook/set/${instanceName}`, apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook: { url: webhookUrl, enabled: true, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"], webhook_by_events: false, webhook_base64: false },
        }),
      });

      await admin.from("whatsapp_qr_connections").update({
        status: "connected", sync_health: "active", recovery_state: "repaired",
        recovery_attempt_count: 0, last_seen_at: now, last_reconnect_at: now,
        last_error: null, sync_issue_reason: null, metadata_json: {}, updated_at: now,
      }).eq("workspace_id", workspaceId);

      await admin.from("whatsapp_connections").upsert({
        workspace_id: workspaceId, is_active: true, updated_at: now,
      }, { onConflict: "workspace_id" });

      return jsonRes({ ok: true, status: "connected", sync_health: "active", recovery_state: "repaired" });
    }

    // Save pending_action for async recovery via status polling instead of escalating here
    await admin.from("whatsapp_qr_connections").update({
      metadata_json: { pending_action: "delete_and_recreate" },
      recovery_state: "reconnecting",
      updated_at: now,
    }).eq("workspace_id", workspaceId);

    return jsonRes({ ok: false, status: "creating_instance", recovery_state: "reconnecting", preparing: true });
  } catch (error) {
    console.error("[WA_RECONNECT] ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
