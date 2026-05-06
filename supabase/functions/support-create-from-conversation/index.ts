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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      workspace_id,
      conversation_id,
      contact_id,
      lead_id,
      whatsapp_message_id,
      product_id,
      order_id,
      deal_id,
      title,
      description,
      category,
      category_id,
      priority = "medium",
      assigned_to,
      ai_summary,
      ai_recommendation,
      ai_intent,
      ai_urgency,
      ai_draft = false,
      source = "whatsapp",
      tags = [],
    } = body ?? {};

    if (!workspace_id || !title) {
      return new Response(JSON.stringify({ error: "workspace_id and title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify workspace membership
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

    // For client_user_id we need a placeholder — use the agent if no client_user known
    const insertPayload: Record<string, unknown> = {
      workspace_id,
      subject: String(title).slice(0, 500),
      description: description ? String(description).slice(0, 10000) : null,
      type: "support",
      priority,
      status: "open",
      source,
      conversation_id: conversation_id ?? null,
      contact_id: contact_id ?? null,
      lead_id: lead_id ?? null,
      whatsapp_message_id: whatsapp_message_id ?? null,
      product_id: product_id ?? null,
      order_id: order_id ?? null,
      deal_id: deal_id ?? null,
      category: category ?? null,
      category_id: category_id ?? null,
      assigned_to: assigned_to ?? userId,
      ai_summary: ai_summary ?? null,
      ai_recommendation: ai_recommendation ?? null,
      ai_intent: ai_intent ?? null,
      ai_urgency: ai_urgency ?? null,
      ai_draft: !!ai_draft,
      tags: Array.isArray(tags) ? tags : [],
      // satisfy NOT NULL constraint with the agent acting on behalf
      client_user_id: userId,
      metadata: { created_via: "support-create-from-conversation" },
    };

    const { data: ticket, error: insertErr } = await admin
      .from("client_tickets")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertErr) {
      console.error("[SUPPORT][CREATE] insert failed", insertErr);
      return new Response(
        JSON.stringify({ error: "internal_error", fallback: true, message: insertErr.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Timeline event
    await admin.from("support_ticket_events").insert({
      workspace_id,
      ticket_id: ticket.id,
      event_type: ai_draft ? "support.ticket.created_draft" : "support.ticket.created",
      description: ai_draft
        ? "Rascunho criado a partir da Inbox Intelligence (aguarda confirmação)."
        : "Ticket criado a partir de conversa WhatsApp.",
      created_by: userId,
      payload: {
        conversation_id,
        contact_id,
        whatsapp_message_id,
        ai_intent,
        ai_urgency,
        priority,
        source,
      },
    });

    return new Response(JSON.stringify({ ticket }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[SUPPORT][CREATE] error", e);
    return new Response(
      JSON.stringify({ error: "internal_error", fallback: true, message: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
