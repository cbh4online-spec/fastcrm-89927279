// Public endpoint — start (or resume) a website chat widget session.
// No JWT required: validation happens via widget public_key + domain allowlist.

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

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function pickOrigin(req: Request, page_url?: string | null): string | null {
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (origin) {
    try { return new URL(origin).hostname; } catch { /* ignore */ }
  }
  if (page_url) {
    try { return new URL(page_url).hostname; } catch { /* ignore */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json(400, { error: "Invalid JSON" });

    const widget_public_key = String(body.widget_public_key ?? "").trim();
    const visitor_id = String(body.visitor_id ?? "").trim();
    const page_url = (body.page_url as string | undefined) ?? null;
    const referrer = (body.referrer as string | undefined) ?? null;
    const utm = (body.utm as Record<string, string> | undefined) ?? {};
    const user_agent = (body.user_agent as string | undefined) ?? req.headers.get("user-agent") ?? null;

    if (!widget_public_key || !visitor_id) {
      return json(400, { error: "widget_public_key and visitor_id are required" });
    }
    if (visitor_id.length > 128) return json(400, { error: "visitor_id too long" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: widget, error: widgetErr } = await supabase
      .from("website_chat_widgets")
      .select("id, workspace_id, status, domain_allowlist, default_language, welcome_message, offline_message, lead_capture_required, lead_capture_timing, collect_name, collect_email, collect_phone, collect_company, collect_intent, appearance, behavior_settings, whatsapp_number, handoff_channel")
      .eq("public_key", widget_public_key)
      .maybeSingle();

    if (widgetErr || !widget) return json(404, { error: "Widget not found" });
    if (widget.status !== "active") return json(403, { error: "Widget inactive" });

    // Domain allowlist check
    const hostname = pickOrigin(req, page_url);
    const allowlist = (widget.domain_allowlist ?? []) as string[];
    if (allowlist.length > 0 && hostname && !allowlist.some(d => hostname === d || hostname.endsWith("." + d))) {
      await supabase.from("website_widget_security_logs").insert({
        workspace_id: widget.workspace_id,
        widget_id: widget.id,
        event_type: "domain_blocked",
        severity: "warning",
        ip_hash: null,
        user_agent,
        payload: { hostname, allowlist },
      });
      return json(403, { error: "Domain not allowed" });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ip_hash = ip ? await sha256(ip) : null;

    // Resume existing active session if visitor_id matches and < 30min old
    const { data: existing } = await supabase
      .from("website_chat_sessions")
      .select("id, communication_conversation_id, status")
      .eq("widget_id", widget.id)
      .eq("visitor_id", visitor_id)
      .in("status", ["active", "waiting_for_agent"])
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let session_id: string;
    let conversation_id: string | null = null;

    if (existing?.id) {
      session_id = existing.id;
      conversation_id = existing.communication_conversation_id;
      await supabase.from("website_chat_sessions").update({ last_activity_at: new Date().toISOString(), current_page_url: page_url }).eq("id", session_id);
    } else {
      // Create new conversation in omnichannel
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          workspace_id: widget.workspace_id,
          channel: "website_chat",
          status: "open",
          subject: "Chat do Site",
          metadata: { widget_id: widget.id, visitor_id, page_url, referrer, utm },
        })
        .select("id")
        .single();
      if (!convErr && conv) conversation_id = conv.id;

      const { data: newSession, error: sessErr } = await supabase
        .from("website_chat_sessions")
        .insert({
          workspace_id: widget.workspace_id,
          widget_id: widget.id,
          communication_conversation_id: conversation_id,
          visitor_id,
          current_page_url: page_url,
          landing_page_url: page_url,
          referrer,
          utm_source: utm.source ?? null,
          utm_medium: utm.medium ?? null,
          utm_campaign: utm.campaign ?? null,
          utm_content: utm.content ?? null,
          utm_term: utm.term ?? null,
          ip_hash,
          user_agent,
        })
        .select("id")
        .single();
      if (sessErr || !newSession) return json(500, { error: "Failed to create session" });
      session_id = newSession.id;

      // System welcome message
      if (widget.welcome_message) {
        await supabase.from("website_chat_messages").insert({
          workspace_id: widget.workspace_id,
          session_id,
          direction: "bot",
          message_type: "text",
          content: widget.welcome_message,
        });
      }
    }

    return json(200, {
      session_id,
      conversation_id,
      widget: {
        id: widget.id,
        language: widget.default_language,
        welcome_message: widget.welcome_message,
        offline_message: widget.offline_message,
        appearance: widget.appearance,
        behavior_settings: widget.behavior_settings,
        lead_capture: {
          required: widget.lead_capture_required,
          timing: widget.lead_capture_timing,
          collect_name: widget.collect_name,
          collect_email: widget.collect_email,
          collect_phone: widget.collect_phone,
          collect_company: widget.collect_company,
          collect_intent: widget.collect_intent,
        },
        whatsapp_number: widget.whatsapp_number,
        handoff_channel: widget.handoff_channel,
      },
    });
  } catch (e) {
    console.error("[widget-start-session]", e);
    return json(200, { fallback: true, error: e instanceof Error ? e.message : "internal_error" });
  }
});
