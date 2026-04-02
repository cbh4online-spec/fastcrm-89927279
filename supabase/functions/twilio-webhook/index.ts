import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Twilio sends form-urlencoded POST
    const formData = await req.text();
    const params = new URLSearchParams(formData);

    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const body = params.get("Body") || "";
    const messageSid = params.get("MessageSid") || "";

    if (!from || !to || !messageSid) {
      console.error("[twilio-webhook] Missing required fields");
      return new Response("<Response></Response>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    console.log(`[twilio-webhook] Inbound SMS from=${from} to=${to} sid=${messageSid}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find workspace by the Twilio phone number (the "To" number is our number)
    const { data: twilioConn, error: connErr } = await supabaseAdmin
      .from("twilio_connections")
      .select("workspace_id, is_active")
      .eq("twilio_phone_number", to)
      .eq("is_active", true)
      .maybeSingle();

    if (connErr || !twilioConn) {
      console.error("[twilio-webhook] No active Twilio connection for number:", to);
      return new Response("<Response></Response>", {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const workspaceId = twilioConn.workspace_id;

    // Find or create conversation by phone number
    const { data: existingConv } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("channel", "sms")
      .contains("channel_metadata", { source: "twilio", phone: from })
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Try to find a lead with this phone
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("phone", from)
        .maybeSingle();

      const { data: newConv, error: newConvErr } = await supabaseAdmin
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          channel: "sms",
          status: "open",
          last_message_at: new Date().toISOString(),
          lead_id: lead?.id || null,
          channel_metadata: { source: "twilio", phone: from },
        })
        .select("id")
        .single();

      if (newConvErr) throw newConvErr;
      conversationId = newConv.id;
    }

    // Save inbound message
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      workspace_id: workspaceId,
      direction: "inbound",
      content: body,
      attachments: [],
      sender_id: null,
      sent_at: new Date().toISOString(),
    });

    // Update conversation preview (trigger should handle this, but be safe)
    await supabaseAdmin
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: body.substring(0, 100),
        last_message_direction: "inbound",
        status: "open",
      })
      .eq("id", conversationId);

    console.log(`[twilio-webhook] Saved inbound message to conversation ${conversationId}`);

    // Return TwiML empty response (no auto-reply)
    return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: unknown) {
    console.error("[twilio-webhook] Error:", error);
    return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
});
