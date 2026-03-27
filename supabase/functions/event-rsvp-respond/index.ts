import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rsvpId = url.searchParams.get("rsvp_id");
    const action = url.searchParams.get("action");

    if (!rsvpId || !action || !["confirm", "decline"].includes(action)) {
      return new Response("Parâmetros inválidos", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const newStatus = action === "confirm" ? "confirmed" : "declined";

    // Get the RSVP with email info
    const { data: rsvp, error: fetchErr } = await supabase
      .from("event_rsvps")
      .select("id, event_id, status, email, name")
      .eq("id", rsvpId)
      .single();

    if (fetchErr || !rsvp) {
      return new Response("Convite não encontrado", { status: 404, headers: corsHeaders });
    }

    // Update status
    const { error: updateErr } = await supabase
      .from("event_rsvps")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", rsvpId);

    if (updateErr) {
      console.error("[RSVP-RESPOND] Update error:", updateErr);
      return new Response("Erro ao processar resposta", { status: 500, headers: corsHeaders });
    }

    // Get event details for email and redirect
    const { data: event } = await supabase
      .from("community_events")
      .select("title, starts_at, location")
      .eq("id", rsvp.event_id)
      .single();

    // Send confirmation email if confirmed and has email
    if (newStatus === "confirmed" && rsvp.email && event) {
      const dateFormatted = new Date(event.starts_at).toLocaleDateString("pt-PT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "event-confirmation",
            recipientEmail: rsvp.email,
            idempotencyKey: `event-confirm-${rsvpId}`,
            templateData: {
              name: rsvp.name || "",
              eventTitle: event.title,
              eventDate: dateFormatted,
              eventLocation: event.location || "",
              eventUrl: `https://fastcrm.lovable.app/dashboard/events/${rsvp.event_id}`,
            },
          },
        });
        console.log("[RSVP-RESPOND] Confirmation email sent to", rsvp.email);
      } catch (emailErr) {
        console.warn("[RSVP-RESPOND] Confirmation email failed:", emailErr);
      }
    }

    const baseUrl = "https://fastcrm.lovable.app";
    const redirectUrl = `${baseUrl}/event-rsvp?status=${newStatus}&event=${encodeURIComponent(event?.title || "")}`;

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  } catch (error: any) {
    console.error("[RSVP-RESPOND] Error:", error);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
