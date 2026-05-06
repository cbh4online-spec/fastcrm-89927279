// Public endpoint — visitor sends a message to the widget chat.
// Validates widget public_key + session ownership, persists message,
// mirrors into omnichannel (conversations/messages), updates session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json(400, { error: "Invalid JSON" });

    const session_id = String(body.session_id ?? "").trim();
    const widget_public_key = String(body.widget_public_key ?? "").trim();
    const visitor_id = String(body.visitor_id ?? "").trim();
    const message = String(body.message ?? "").trim();
    const message_type = String(body.message_type ?? "text");
    const metadata = (body.metadata as Record<string, unknown> | undefined) ?? {};
    const lead = (body.lead as Record<string, unknown> | undefined) ?? null;

    if (!session_id || !widget_public_key || !visitor_id) {
      return json(400, { error: "session_id, widget_public_key and visitor_id are required" });
    }
    if (!["text", "form", "quick_reply"].includes(message_type)) {
      return json(400, { error: "Invalid message_type" });
    }
    if (message_type === "text" && (!message || message.length > 4000)) {
      return json(400, { error: "Message must be 1..4000 chars" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: widget } = await supabase
      .from("website_chat_widgets")
      .select("id, workspace_id, status")
      .eq("public_key", widget_public_key)
      .maybeSingle();
    if (!widget || widget.status !== "active") return json(403, { error: "Widget invalid" });

    const { data: session } = await supabase
      .from("website_chat_sessions")
      .select("id, workspace_id, widget_id, visitor_id, communication_conversation_id, contact_id, lead_id")
      .eq("id", session_id)
      .maybeSingle();
    if (!session || session.widget_id !== widget.id || session.visitor_id !== visitor_id) {
      return json(403, { error: "Session mismatch" });
    }

    // Optional lead capture data piggy-backed on the message
    if (lead && (lead.name || lead.email || lead.phone || lead.company || lead.intent)) {
      await supabase.from("website_lead_captures").insert({
        workspace_id: session.workspace_id,
        widget_id: session.widget_id,
        session_id: session.id,
        contact_id: session.contact_id,
        lead_id: session.lead_id,
        name: lead.name as string ?? null,
        email: lead.email as string ?? null,
        phone: lead.phone as string ?? null,
        company: lead.company as string ?? null,
        intent: lead.intent as string ?? null,
        raw_answers: lead,
      });
      // Update session with visitor identity
      await supabase.from("website_chat_sessions").update({
        visitor_name: lead.name as string ?? null,
        visitor_email: lead.email as string ?? null,
        visitor_phone: lead.phone as string ?? null,
        visitor_company: lead.company as string ?? null,
      }).eq("id", session.id);
    }

    // Insert chat message (visitor)
    const { data: msg, error: msgErr } = await supabase
      .from("website_chat_messages")
      .insert({
        workspace_id: session.workspace_id,
        session_id: session.id,
        direction: "visitor",
        message_type,
        content: message_type === "text" ? message : null,
        metadata,
      })
      .select("id")
      .single();
    if (msgErr) return json(500, { error: "Failed to persist message" });

    // Mirror into omnichannel messages (best-effort)
    if (session.communication_conversation_id) {
      await supabase.from("messages").insert({
        workspace_id: session.workspace_id,
        conversation_id: session.communication_conversation_id,
        direction: "inbound",
        content: message,
        message_type: "text",
        sent_at: new Date().toISOString(),
        metadata: { website_chat_message_id: msg.id, visitor_id },
      });
      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.slice(0, 200),
        last_message_direction: "inbound",
      }).eq("id", session.communication_conversation_id);
    }

    // Update session last activity
    await supabase.from("website_chat_sessions").update({
      last_activity_at: new Date().toISOString(),
    }).eq("id", session.id);

    return json(200, { ok: true, message_id: msg.id });
  } catch (e) {
    console.error("[widget-send-message]", e);
    return json(200, { fallback: true, error: e instanceof Error ? e.message : "internal_error" });
  }
});
