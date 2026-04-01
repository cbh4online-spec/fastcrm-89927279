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

    // Get instance name from DB
    const { data: conn } = await adminClient
      .from("whatsapp_qr_connections")
      .select("instance_name")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!conn?.instance_name) {
      return jsonRes({ error: "No active QR connection found" }, 404);
    }

    const instanceName = conn.instance_name;
    const now = new Date().toISOString();

    console.log(`[WHATSAPP_QR] DISCONNECT_START workspace=${workspaceId} instance=${instanceName}`);

    // 1. Logout from Evolution API
    try {
      const logoutRes = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      const logoutText = await logoutRes.text();
      console.log(`[WHATSAPP_QR] LOGOUT status=${logoutRes.status} body=${logoutText.substring(0, 200)}`);
    } catch (e) {
      console.warn(`[WHATSAPP_QR] LOGOUT_FAILED error=${e.message}`);
    }

    // 2. Delete instance from Evolution API
    try {
      const deleteRes = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_API_KEY },
      });
      console.log(`[WHATSAPP_QR] DELETE_INSTANCE status=${deleteRes.status}`);
      await deleteRes.text(); // consume body
    } catch (e) {
      console.warn(`[WHATSAPP_QR] DELETE_FAILED error=${e.message}`);
    }

    // 3. Update whatsapp_qr_connections
    await adminClient.from("whatsapp_qr_connections").update({
      status: "disconnected",
      disconnected_at: now,
      qr_code: null,
      phone_number: null,
      last_error: null,
      updated_at: now,
    }).eq("workspace_id", workspaceId);

    // 4. Update whatsapp_connections for inbox compatibility
    await adminClient.from("whatsapp_connections").update({
      is_active: false,
      updated_at: now,
    }).eq("workspace_id", workspaceId);

    console.log(`[WHATSAPP_QR] DISCONNECTED workspace=${workspaceId}`);

    return jsonRes({ success: true, status: "disconnected" });
  } catch (error) {
    console.error("[WHATSAPP_QR] DISCONNECT_ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
