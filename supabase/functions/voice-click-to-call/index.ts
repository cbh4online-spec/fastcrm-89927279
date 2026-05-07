// voice-click-to-call — Fase 1P. Usa adapter dinâmico por provider.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter, buildRuntimeConfig, estimateCost } from "../_shared/voice/adapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return jsonResp({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const {
      workspace_id,
      provider_instance_id,
      from_number_id,
      to_number,
      contact_id,
      context = {},
      record = false,
    } = body ?? {};

    if (!workspace_id || !to_number) {
      return jsonResp({ error: "workspace_id e to_number obrigatórios" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Permissões: workspace member
    const { data: membership } = await admin
      .from("workspace_members").select("user_id")
      .eq("workspace_id", workspace_id).eq("user_id", userId).maybeSingle();
    if (!membership) return jsonResp({ error: "Forbidden" }, 403);

    // 2) Provider instance
    let instance: any = null;
    if (provider_instance_id) {
      const { data } = await admin
        .from("voice_provider_instances").select("*")
        .eq("id", provider_instance_id).eq("workspace_id", workspace_id).maybeSingle();
      instance = data;
    } else {
      const { data } = await admin
        .from("voice_provider_instances").select("*")
        .eq("workspace_id", workspace_id).eq("status", "active")
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      instance = data;
    }
    // Fallback para mock se não houver provider
    if (!instance) {
      instance = {
        id: null, workspace_id, provider_name: "mock", settings: {},
        default_country: "PT", default_country_code: "+351", default_currency: "EUR",
        environment: "demo",
      };
    }
    if (instance.status && instance.status !== "active" && instance.provider_name !== "mock") {
      return jsonResp({ error: "provider_inactive", message: "Fornecedor de voz inativo." }, 400);
    }

    // 3) Número de saída
    let fromNumber: string | null = null;
    if (from_number_id) {
      const { data: vn } = await admin
        .from("voice_numbers").select("normalized_number")
        .eq("id", from_number_id).eq("workspace_id", workspace_id).maybeSingle();
      fromNumber = vn?.normalized_number ?? null;
    }
    if (!fromNumber) {
      fromNumber = (instance.settings?.from_number as string) ?? null;
    }
    if (!fromNumber && instance.provider_name !== "mock") {
      return jsonResp({ error: "missing_from_number", message: "Configure número de saída." }, 400);
    }

    // 4) Compliance check para gravação
    let allowRecord = false;
    if (record) {
      const { data: compliance } = await admin
        .from("voice_compliance_settings").select("*")
        .eq("workspace_id", workspace_id).maybeSingle();
      allowRecord = !!compliance?.recording_allowed;
      if (!allowRecord) {
        return jsonResp({
          error: "recording_not_allowed",
          message: "As gravações estão desativadas. Ative compliance e confirme base legal antes de gravar chamadas.",
        }, 400);
      }
    }

    // 5) Conversation 'phone' por contacto
    let conversationId: string | null = null;
    if (contact_id) {
      const externalThreadId = `phone:${contact_id}`;
      const { data: existing } = await admin
        .from("conversations").select("id")
        .eq("workspace_id", workspace_id).eq("channel", "phone")
        .eq("external_thread_id", externalThreadId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) conversationId = existing.id;
      else {
        const { data: created } = await admin.from("conversations").insert({
          workspace_id, channel: "phone", external_thread_id: externalThreadId,
          contact_id, status: "open",
          channel_metadata: { source: "voicehub", provider: instance.provider_name },
          last_message_at: new Date().toISOString(),
        }).select("id").single();
        conversationId = created?.id ?? null;
      }
    }

    // 6) Adapter call
    const config = buildRuntimeConfig(instance);
    const adapter = getAdapter(instance.provider_name);
    const startTs = Date.now();
    const result = await adapter.clickToCall(
      { workspaceId: workspace_id, fromNumber: fromNumber ?? "", toNumber: to_number, contactId: contact_id, record: allowRecord, context },
      config,
    );
    const durationMs = Date.now() - startTs;

    // 7) Provider log (request)
    if (instance.id) {
      await admin.from("voice_provider_logs").insert({
        workspace_id,
        provider_instance_id: instance.id,
        provider_name: instance.provider_name,
        event_type: "click_to_call",
        direction: "outbound_request",
        provider_call_id: result.providerCallId ?? null,
        endpoint: "/clickToCall",
        normalized_payload: { input: { to_number, from_number: fromNumber, record: allowRecord } },
        response_payload: result.raw ?? null,
        success: !!result.success,
        processed: true,
        duration_ms: durationMs,
        error: result.success ? null : result.message ?? null,
      });
    }

    if (!result.success) {
      return jsonResp({ error: "provider_error", message: result.message, raw: result.raw }, 200);
    }

    // 8) Cost estimation
    const { data: rate } = await admin
      .from("voice_provider_rates").select("*")
      .eq("provider_name", instance.provider_name)
      .eq("country", instance.default_country ?? "PT")
      .eq("active", true)
      .order("workspace_id", { ascending: false, nullsFirst: false })
      .limit(1).maybeSingle();
    const costEst = estimateCost({
      durationSeconds: result.durationSeconds ?? 0,
      costPerMinute: rate?.cost_per_minute,
      connectionFee: rate?.connection_fee,
      billingIncrementSeconds: rate?.billing_increment_seconds,
      currency: rate?.currency ?? instance.default_currency,
    });

    // 9) Insert call log
    const { data: callLog, error } = await admin.from("voice_call_logs").insert({
      workspace_id,
      provider_instance_id: instance.id,
      voice_number_id: from_number_id ?? null,
      communication_conversation_id: conversationId,
      contact_id: contact_id ?? null,
      ticket_id: context.ticket_id ?? null,
      deal_id: context.deal_id ?? null,
      appointment_id: context.appointment_id ?? null,
      assigned_to: userId,
      created_by: userId,
      call_direction: "outbound",
      call_type: "phone_call",
      status: result.status,
      from_number: fromNumber,
      to_number,
      normalized_from_number: fromNumber,
      normalized_to_number: to_number,
      country: instance.default_country ?? "PT",
      started_at: result.startedAt ?? new Date().toISOString(),
      ended_at: result.endedAt ?? null,
      duration_seconds: result.durationSeconds ?? null,
      provider_call_id: result.providerCallId,
      provider_status: result.status,
      cost_amount: costEst.amount,
      currency: costEst.currency,
      last_status_at: new Date().toISOString(),
      metadata: { mock: !!result.isMock, context, provider: instance.provider_name },
    }).select().single();

    if (error) {
      console.error("voice-click-to-call insert error", error);
      return jsonResp({ error: "internal_error", details: error.message }, 200);
    }

    // 10) Mensagem na conversa omnicanal
    if (conversationId) {
      await admin.from("messages").insert({
        conversation_id: conversationId,
        workspace_id,
        direction: "outbound",
        content: result.isMock
          ? `Chamada simulada (modo demonstração) — ${result.durationSeconds ?? 0}s`
          : `Chamada efetuada via VoiceHub${result.durationSeconds ? ` — ${result.durationSeconds}s` : ""}`,
        sender_id: userId,
        sent_at: result.startedAt ?? new Date().toISOString(),
        message_type: "call_log",
      });
    }

    return jsonResp({
      success: true,
      provider_call_id: result.providerCallId,
      is_mock: !!result.isMock,
      call_log: callLog,
      cost: costEst,
      message: result.isMock ? "Modo demonstração — chamada simulada." : "Chamada iniciada via VoiceHub.",
    });
  } catch (e: any) {
    console.error("voice-click-to-call fatal", e);
    return jsonResp({ error: "internal_error", message: String(e?.message ?? e), fallback: true }, 200);
  }
});
