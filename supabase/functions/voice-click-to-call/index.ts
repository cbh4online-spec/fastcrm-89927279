// supabase/functions/voice-click-to-call/index.ts
// Mock click-to-call: cria call log completed com duração 30-180s.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return jsonResp({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const { workspace_id, contact_id, to_number, from_number_id, provider_instance_id, context = {} } = body ?? {};

    if (!workspace_id || !to_number) return jsonResp({ error: "workspace_id e to_number obrigatórios" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: membership } = await admin
      .from("workspace_members").select("user_id")
      .eq("workspace_id", workspace_id).eq("user_id", userId).maybeSingle();
    if (!membership) return jsonResp({ error: "Forbidden" }, 403);

    // Resolver provider — se não fornecido ou não for mock, fica em modo simulado
    let providerName = "mock";
    if (provider_instance_id) {
      const { data: prov } = await admin
        .from("voice_provider_instances").select("provider_name, status")
        .eq("id", provider_instance_id).eq("workspace_id", workspace_id).maybeSingle();
      providerName = prov?.provider_name ?? "mock";
    }

    const isMock = providerName === "mock";
    const duration = 30 + Math.floor(Math.random() * 151);
    const startedAt = new Date();
    const endedAt = new Date(startedAt.getTime() + duration * 1000);
    const providerCallId = `mock_${crypto.randomUUID()}`;

    // Resolver número de origem
    let fromNumber: string | null = null;
    if (from_number_id) {
      const { data: vn } = await admin
        .from("voice_numbers").select("normalized_number")
        .eq("id", from_number_id).eq("workspace_id", workspace_id).maybeSingle();
      fromNumber = vn?.normalized_number ?? null;
    }

    // Conversation 'phone' por contacto (se existir)
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
          channel_metadata: { source: "voicehub", click_to_call: true },
          last_message_at: startedAt.toISOString(),
        }).select("id").single();
        conversationId = created?.id ?? null;
      }
    }

    const { data: callLog, error } = await admin.from("voice_call_logs").insert({
      workspace_id,
      provider_instance_id: provider_instance_id ?? null,
      voice_number_id: from_number_id ?? null,
      communication_conversation_id: conversationId,
      contact_id: contact_id ?? null,
      ticket_id: context.ticket_id ?? null,
      deal_id: context.deal_id ?? null,
      assigned_to: userId,
      created_by: userId,
      call_direction: "outbound",
      call_type: "phone_call",
      status: "completed",
      from_number: fromNumber,
      to_number,
      normalized_from_number: fromNumber,
      normalized_to_number: to_number,
      country: "PT",
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_seconds: duration,
      provider_call_id: providerCallId,
      provider_status: isMock ? "mock_simulated" : "unknown",
      metadata: { mock: isMock, context },
    }).select().single();

    if (error) {
      console.error("voice-click-to-call insert error", error);
      return jsonResp({ error: "internal_error", details: error.message }, 200);
    }

    if (conversationId) {
      await admin.from("messages").insert({
        conversation_id: conversationId,
        workspace_id,
        direction: "outbound",
        content: isMock
          ? `Chamada simulada (modo demonstração) — ${duration}s`
          : `Chamada efetuada — ${duration}s`,
        sender_id: userId,
        sent_at: startedAt.toISOString(),
        message_type: "call_log",
      });
    }

    return jsonResp({
      success: true,
      provider_call_id: providerCallId,
      is_mock: isMock,
      call_log: callLog,
      message: isMock ? "Modo demonstração — chamada simulada." : "Chamada iniciada.",
    }, 200);
  } catch (e) {
    console.error("voice-click-to-call fatal", e);
    return jsonResp({ error: "internal_error", message: String(e) }, 200);
  }
});

function jsonResp(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
