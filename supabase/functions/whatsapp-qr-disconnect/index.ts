import {
  corsHeaders, jsonRes, evoFetch, getAdminClient, getEvolutionConfig,
  validateAuth, validateWorkspaceMembership,
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

    // 3. Get instance from DB
    const { data: conn } = await admin
      .from("whatsapp_qr_connections")
      .select("instance_name")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!conn?.instance_name) return jsonRes({ error: "No active QR connection found" }, 404);

    const instanceName = conn.instance_name;
    const now = new Date().toISOString();

    console.log(`[WHATSAPP_QR] DISCONNECT_START workspace=${workspaceId} instance=${instanceName}`);

    // 4. Logout from Evolution API
    await evoFetch(baseUrl, `/instance/logout/${instanceName}`, apiKey, { method: "DELETE" });

    // 5. Delete instance
    await evoFetch(baseUrl, `/instance/delete/${instanceName}`, apiKey, { method: "DELETE" });

    // 6. Update DB
    await admin.from("whatsapp_qr_connections").update({
      status: "disconnected", disconnected_at: now,
      qr_code: null, phone_number: null, last_error: null,
      recovery_state: "none", recovery_attempt_count: 0,
      sync_health: "unknown", metadata_json: {},
      updated_at: now,
    }).eq("workspace_id", workspaceId);

    await admin.from("whatsapp_connections").update({
      is_active: false, updated_at: now,
    }).eq("workspace_id", workspaceId);

    console.log(`[WHATSAPP_QR] DISCONNECTED workspace=${workspaceId}`);
    return jsonRes({ success: true, status: "disconnected" });
  } catch (error) {
    console.error("[WHATSAPP_QR] DISCONNECT_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
