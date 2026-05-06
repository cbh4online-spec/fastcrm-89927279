import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { workspace_id, ticket_id, message } = await req.json();
    if (!workspace_id || !ticket_id || !message?.trim()) {
      return new Response(JSON.stringify({ error: "workspace_id, ticket_id and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: member } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticket } = await admin
      .from("client_tickets")
      .select("id,workspace_id,conversation_id,first_response_at")
      .eq("id", ticket_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();
    if (!ticket) {
      return new Response(JSON.stringify({ error: "ticket_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up conversation phone
    let conversationId: string | null = ticket.conversation_id ?? null;
    let phone: string | null = null;
    if (conversationId) {
      const { data: conv } = await admin
        .from("conversations")
        .select("id,channel_metadata,external_thread_id")
        .eq("id", conversationId)
        .maybeSingle();
      const meta = (conv?.channel_metadata ?? {}) as Record<string, unknown>;
      phone = (meta.phone as string) ?? (meta.from as string) ?? conv?.external_thread_id ?? null;
    }

    let sendResult: { ok: boolean; error?: string; provider_message_id?: string } = { ok: false };

    if (phone) {
      try {
        const sendResp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-pro-send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id,
            phone,
            message,
            conversation_id: conversationId,
            metadata: { source: "support_ticket", ticket_id },
          }),
        });
        const sj = await sendResp.json().catch(() => ({}));
        sendResult = sendResp.ok && !sj?.error
          ? { ok: true, provider_message_id: sj?.provider_message_id ?? sj?.message_id }
          : { ok: false, error: sj?.error ?? `status_${sendResp.status}` };
      } catch (e) {
        sendResult = { ok: false, error: (e as Error).message };
      }
    } else {
      sendResult = { ok: false, error: "no_phone_on_conversation" };
    }

    // Always persist the agent reply on the ticket timeline (even if WhatsApp send failed,
    // so the agent has a record). A failed send is flagged in metadata.
    await admin.from("client_ticket_messages").insert({
      ticket_id,
      sender_type: "agent",
      sender_id: userId,
      message: String(message).slice(0, 8000),
      content_type: "text",
      is_internal_note: false,
      attachments: [],
    });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (!ticket.first_response_at && sendResult.ok) {
      updates.first_response_at = new Date().toISOString();
    }
    await admin.from("client_tickets").update(updates).eq("id", ticket_id);

    await admin.from("support_ticket_events").insert({
      workspace_id,
      ticket_id,
      event_type: sendResult.ok ? "support.ticket.first_response_sent" : "support.ticket.reply_failed",
      description: sendResult.ok
        ? "Resposta enviada para o cliente por WhatsApp."
        : `Falha ao enviar resposta WhatsApp: ${sendResult.error}`,
      created_by: userId,
      payload: { phone: phone ? phone.replace(/.(?=.{4})/g, "*") : null, ...sendResult },
    });

    return new Response(
      JSON.stringify({ ok: sendResult.ok, error: sendResult.error, provider_message_id: sendResult.provider_message_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[SUPPORT][REPLY] error", e);
    return new Response(
      JSON.stringify({ error: "internal_error", fallback: true, message: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
