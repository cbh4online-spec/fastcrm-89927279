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
    const body = await req.json();
    console.log(`[WHATSAPP_WEBHOOK] RECEIVED event=${body?.event} raw=${JSON.stringify(body).substring(0, 500)}`);

    // Validate webhook secret if configured
    const WEBHOOK_SECRET = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers.get("x-webhook-secret") || body?.apikey;
      if (incomingSecret !== WEBHOOK_SECRET) {
        console.warn(`[WHATSAPP_WEBHOOK] INVALID_SECRET`);
        return jsonRes({ error: "Unauthorized" }, 401);
      }
    }

    const event = body?.event;
    if (event !== "connection.update") {
      console.log(`[WHATSAPP_WEBHOOK] IGNORED_EVENT event=${event}`);
      return jsonRes({ received: true, ignored: true });
    }

    // Extract instance name from the payload
    const instanceName = body?.instance || body?.data?.instance || null;
    const rawState = body?.data?.state || body?.state || null;

    if (!instanceName || !rawState) {
      console.warn(`[WHATSAPP_WEBHOOK] MISSING_DATA instance=${instanceName} state=${rawState}`);
      return jsonRes({ error: "Missing instance or state" }, 400);
    }

    const mappedStatus = mapEvolutionState(rawState);
    console.log(`[WHATSAPP_WEBHOOK] CONNECTION_UPDATE instance=${instanceName} raw=${rawState} mapped=${mappedStatus}`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find workspace by instance_name
    const { data: conn, error: findError } = await adminClient
      .from("whatsapp_qr_connections")
      .select("workspace_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (findError || !conn) {
      console.warn(`[WHATSAPP_WEBHOOK] WORKSPACE_NOT_FOUND instance=${instanceName} error=${findError?.message}`);
      return jsonRes({ received: true, matched: false });
    }

    const workspaceId = conn.workspace_id;
    const now = new Date().toISOString();

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      status: mappedStatus,
      last_seen_at: now,
      updated_at: now,
    };

    if (mappedStatus === "connected") {
      updatePayload.connected_at = now;
      updatePayload.last_error = null;
      updatePayload.disconnected_at = null;

      // Try to extract phone from webhook data
      let phoneNumber = body?.data?.owner || body?.data?.wuid || null;
      if (phoneNumber && phoneNumber.includes("@")) {
        phoneNumber = phoneNumber.split("@")[0];
      }
      if (phoneNumber) {
        updatePayload.phone_number = phoneNumber;
      }
    } else if (mappedStatus === "disconnected") {
      updatePayload.disconnected_at = now;
    }

    const { error: updateError } = await adminClient
      .from("whatsapp_qr_connections")
      .update(updatePayload)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error(`[WHATSAPP_WEBHOOK] DB_UPDATE_FAILED workspace=${workspaceId} error=${updateError.message}`);
      return jsonRes({ error: "DB update failed" }, 500);
    }

    // Sync whatsapp_connections for inbox
    if (mappedStatus === "connected") {
      await adminClient.from("whatsapp_connections").upsert({
        workspace_id: workspaceId,
        is_active: true,
        display_phone_number: updatePayload.phone_number || null,
        updated_at: now,
      }, { onConflict: "workspace_id" });
    } else if (mappedStatus === "disconnected") {
      await adminClient.from("whatsapp_connections").update({
        is_active: false,
        updated_at: now,
      }).eq("workspace_id", workspaceId);
    }

    console.log(`[WHATSAPP_WEBHOOK] PROCESSED workspace=${workspaceId} status=${mappedStatus}`);
    return jsonRes({ received: true, matched: true, status: mappedStatus });
  } catch (error) {
    console.error("[WHATSAPP_WEBHOOK] ERROR", error);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
