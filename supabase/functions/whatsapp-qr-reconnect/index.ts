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
    const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-evolution-webhook`;

    const { data: conn } = await admin
      .from("whatsapp_qr_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!conn) return jsonRes({ error: "No WhatsApp connection found" }, 404);

    const instanceName = conn.instance_name;
    const currentAttempts = (conn.recovery_attempt_count || 0) + 1;
    const now = new Date().toISOString();

    console.log(`[WA_RECONNECT] START ws=${workspaceId} instance=${instanceName} attempt=${currentAttempts}`);

    await admin.from("whatsapp_qr_connections").update({
      recovery_state: "reconnecting",
      recovery_attempt_count: currentAttempts,
      recovery_last_attempt_at: now, updated_at: now,
    }).eq("workspace_id", workspaceId);

    // Step 1: Restart
    try {
      await api(`${baseUrl}/instance/restart/${instanceName}`, {
        method: "PUT", headers: { apikey: EVOLUTION_API_KEY },
      });
      console.log(`[WA_RECONNECT] RESTART_OK`);
    } catch (e) { console.warn(`[WA_RECONNECT] RESTART_FAIL`, e); }

    await new Promise((r) => setTimeout(r, 2000));

    // Check state
    let state: string | null = null;
    try {
      const sr = await api(`${baseUrl}/instance/connectionState/${instanceName}`, {
        method: "GET", headers: { apikey: EVOLUTION_API_KEY },
      });
      const sd = await sr.json();
      state = sd?.instance?.state || sd?.state || null;
    } catch { /* ignore */ }

    console.log(`[WA_RECONNECT] STATE_AFTER_RESTART=${state}`);

    if (state === "open" || state === "connected") {
      // Set webhook and return success
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
      } catch { /* best effort */ }

      await admin.from("whatsapp_qr_connections").update({
        status: "connected", sync_health: "active", recovery_state: "repaired",
        recovery_attempt_count: 0, last_seen_at: now, last_reconnect_at: now,
        last_error: null, sync_issue_reason: null, updated_at: now,
      }).eq("workspace_id", workspaceId);

      await admin.from("whatsapp_connections").upsert({
        workspace_id: workspaceId, is_active: true, updated_at: now,
      }, { onConflict: "workspace_id" });

      return jsonRes({ ok: true, status: "connected", sync_health: "active", recovery_state: "repaired" });
    }

    // Step 2: Delete + Recreate
    console.log(`[WA_RECONNECT] DELETE instance=${instanceName}`);
    try {
      await api(`${baseUrl}/instance/delete/${instanceName}`, {
        method: "DELETE", headers: { apikey: EVOLUTION_API_KEY },
      });
    } catch { /* best effort */ }

    await new Promise((r) => setTimeout(r, 1000));

    console.log(`[WA_RECONNECT] RECREATE instance=${instanceName}`);
    try {
      await api(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
        body: JSON.stringify({
          instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS",
          webhook: {
            url: webhookUrl, enabled: true,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
            webhook_by_events: false, webhook_base64: false,
          },
        }),
      });
    } catch (e) { console.error(`[WA_RECONNECT] RECREATE_FAIL`, e); }

    // Connect
    const connectRes = await api(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET", headers: { apikey: EVOLUTION_API_KEY },
    });
    const connectData = await connectRes.json();
    const qr = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || null;
    const newState = connectData?.instance?.state || connectData?.state;

    if (qr) {
      await admin.from("whatsapp_qr_connections").update({
        status: "qr_pending", qr_code: qr, qr_updated_at: now,
        recovery_state: "reconnecting", last_reconnect_at: now, last_error: null, updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ ok: true, status: "qr_pending", recovery_state: "reconnecting", needsQRScan: true });
    }

    if (newState === "open" || newState === "connected") {
      await admin.from("whatsapp_qr_connections").update({
        status: "connected", sync_health: "active", recovery_state: "repaired",
        last_seen_at: now, last_reconnect_at: now, updated_at: now,
      }).eq("workspace_id", workspaceId);
      return jsonRes({ ok: true, status: "connected", recovery_state: "repaired" });
    }

    // Failed
    await admin.from("whatsapp_qr_connections").update({
      recovery_state: "repair_required", sync_health: "failed",
      last_error: "Reconexão falhou", updated_at: now,
    }).eq("workspace_id", workspaceId);

    return jsonRes({
      ok: false, recovery_state: "repair_required", sync_health: "failed", needsReconnect: true,
    });
  } catch (error) {
    console.error("[WA_RECONNECT] ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
