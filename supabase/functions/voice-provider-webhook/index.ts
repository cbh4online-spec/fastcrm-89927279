// voice-provider-webhook — Fase 1P. Recebe eventos genéricos de qualquer provider.
// URL esperado: ?provider=twilio&instance_id=xxx&token=yyy[&kind=incoming|status|recording]
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter, buildRuntimeConfig, estimateCost } from "../_shared/voice/adapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readPayload(req: Request): Promise<unknown> {
  const ctype = req.headers.get("content-type") ?? "";
  try {
    if (ctype.includes("application/json")) return await req.json();
    if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
      const fd = await req.formData();
      const obj: Record<string, unknown> = {};
      fd.forEach((v, k) => { obj[k] = typeof v === "string" ? v : v.name; });
      return obj;
    }
    const text = await req.text();
    try { return JSON.parse(text); } catch { return { raw: text }; }
  } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTs = Date.now();
  const url = new URL(req.url);
  const providerName = (url.searchParams.get("provider") ?? "mock").toLowerCase();
  const instanceId = url.searchParams.get("instance_id") ?? url.searchParams.get("provider_instance_id");
  const token = url.searchParams.get("token");
  const kind = (url.searchParams.get("kind") ?? "auto") as "incoming" | "status" | "recording" | "auto";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  const payload = await readPayload(req);

  // 1) Raw log imediato
  let logId: string | null = null;
  try {
    const { data: log } = await admin.from("voice_provider_logs").insert({
      workspace_id: null,
      provider_instance_id: instanceId,
      provider_name: providerName,
      event_type: kind,
      direction: kind === "recording" ? "recording_callback" : kind === "status" ? "status_callback" : "inbound_webhook",
      endpoint: url.pathname + url.search,
      headers,
      request_payload: payload,
      processed: false,
    }).select("id").single();
    logId = log?.id ?? null;
  } catch (e) {
    console.error("voice-provider-webhook raw log err", e);
  }

  try {
    // 2) Provider instance
    let instance: any = null;
    if (instanceId) {
      const { data } = await admin
        .from("voice_provider_instances").select("*")
        .eq("id", instanceId).maybeSingle();
      instance = data;
    }
    if (!instance) {
      // mock fallback ainda assim deixa registado
      return jsonResp({ ok: true, message: "instance not found, payload logged" });
    }

    // 3) Token check (quando configurado)
    if (instance.webhook_token && instance.webhook_token !== token) {
      await admin.from("voice_provider_logs").update({
        processed: true, success: false, error: "invalid_webhook_token",
        duration_ms: Date.now() - startTs,
      }).eq("id", logId!);
      return jsonResp({ ok: false, error: "invalid_token" }, 401);
    }

    const config = buildRuntimeConfig(instance);
    const adapter = getAdapter(instance.provider_name);
    const event = adapter.parseWebhook(kind === "auto" ? "status" : kind, payload, headers, config);

    if (!event) {
      await admin.from("voice_provider_logs").update({
        processed: true, success: true, workspace_id: instance.workspace_id,
        normalized_payload: null, duration_ms: Date.now() - startTs,
      }).eq("id", logId!);
      return jsonResp({ ok: true, message: "event ignored" });
    }

    // 4) Localizar / criar call_log
    const { data: existingCall } = await admin
      .from("voice_call_logs").select("*")
      .eq("workspace_id", instance.workspace_id)
      .eq("provider_call_id", event.providerCallId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    let callLogId: string | null = existingCall?.id ?? null;
    const nowIso = new Date().toISOString();

    if (existingCall) {
      // Update
      const callbackEvents = Array.isArray(existingCall.callback_events) ? existingCall.callback_events : [];
      callbackEvents.push({ type: event.eventType, status: event.status, at: nowIso });

      const update: Record<string, unknown> = {
        status: event.status,
        provider_status: event.status,
        provider_raw_status: event.providerRawStatus ?? null,
        callback_events: callbackEvents,
        webhook_received_at: nowIso,
        last_status_at: nowIso,
      };
      if (event.durationSeconds) update.duration_seconds = event.durationSeconds;
      if (event.endedAt) update.ended_at = event.endedAt;
      if (event.recordingUrl) {
        update.recording_url = event.recordingUrl;
        update.recording_provider_id = event.recordingProviderId ?? null;
        update.recording_duration_seconds = event.recordingDurationSeconds ?? null;
        update.recording_status = "available";
      }
      // Cost recalculation if ended
      if (event.status === "completed" && event.durationSeconds) {
        const { data: rate } = await admin
          .from("voice_provider_rates").select("*")
          .eq("provider_name", instance.provider_name)
          .eq("country", instance.default_country ?? "PT")
          .eq("active", true).limit(1).maybeSingle();
        const cost = estimateCost({
          durationSeconds: event.durationSeconds,
          costPerMinute: rate?.cost_per_minute,
          connectionFee: rate?.connection_fee,
          billingIncrementSeconds: rate?.billing_increment_seconds,
          currency: rate?.currency ?? instance.default_currency,
        });
        update.cost_amount = cost.amount;
        update.currency = cost.currency;
      }
      await admin.from("voice_call_logs").update(update).eq("id", existingCall.id);
    } else if (event.eventType === "call.initiated" || event.direction === "inbound") {
      // Inbound novo
      // Localizar contacto pelo número
      const contactNumber = event.fromNumber ?? null;
      let contactId: string | null = null;
      if (contactNumber) {
        const { data: c } = await admin
          .from("contacts").select("id")
          .eq("workspace_id", instance.workspace_id)
          .or(`phone.eq.${contactNumber},mobile.eq.${contactNumber}`)
          .limit(1).maybeSingle();
        contactId = c?.id ?? null;
      }

      let conversationId: string | null = null;
      if (contactId) {
        const externalThreadId = `phone:${contactId}`;
        const { data: existingConv } = await admin
          .from("conversations").select("id")
          .eq("workspace_id", instance.workspace_id).eq("channel", "phone")
          .eq("external_thread_id", externalThreadId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (existingConv) conversationId = existingConv.id;
        else {
          const { data: created } = await admin.from("conversations").insert({
            workspace_id: instance.workspace_id, channel: "phone",
            external_thread_id: externalThreadId, contact_id: contactId,
            status: "open",
            channel_metadata: { source: "voicehub", provider: instance.provider_name, inbound: true },
            last_message_at: nowIso,
          }).select("id").single();
          conversationId = created?.id ?? null;
        }
      }

      const { data: newCall } = await admin.from("voice_call_logs").insert({
        workspace_id: instance.workspace_id,
        provider_instance_id: instance.id,
        communication_conversation_id: conversationId,
        contact_id: contactId,
        call_direction: event.direction === "inbound" ? "inbound" : "outbound",
        call_type: "phone_call",
        status: event.status,
        from_number: event.fromNumber,
        to_number: event.toNumber,
        normalized_from_number: event.fromNumber,
        normalized_to_number: event.toNumber,
        country: instance.default_country ?? "PT",
        started_at: event.startedAt ?? nowIso,
        provider_call_id: event.providerCallId,
        provider_status: event.status,
        provider_raw_status: event.providerRawStatus ?? null,
        callback_events: [{ type: event.eventType, status: event.status, at: nowIso }],
        webhook_received_at: nowIso,
        last_status_at: nowIso,
        metadata: { provider: instance.provider_name, inbound_unknown: !contactId },
      }).select("id").single();
      callLogId = newCall?.id ?? null;
    }

    // 5) Marcar log processado
    await admin.from("voice_provider_logs").update({
      processed: true,
      success: true,
      workspace_id: instance.workspace_id,
      normalized_payload: event,
      provider_call_id: event.providerCallId,
      duration_ms: Date.now() - startTs,
    }).eq("id", logId!);

    return jsonResp({ ok: true, call_log_id: callLogId, event: event.eventType, status: event.status });
  } catch (e: any) {
    console.error("voice-provider-webhook fatal", e);
    if (logId) {
      await admin.from("voice_provider_logs").update({
        processed: true, success: false, error: String(e?.message ?? e),
        duration_ms: Date.now() - startTs,
      }).eq("id", logId);
    }
    // Sempre 200 para evitar retries inúteis
    return jsonResp({ ok: true, fallback: true, error: String(e?.message ?? e) });
  }
});
