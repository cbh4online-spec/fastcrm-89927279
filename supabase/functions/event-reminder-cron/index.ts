import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find events starting in the next 24h
    const { data: events, error: eventsErr } = await supabase
      .from("community_events")
      .select("id, title, starts_at, location, status")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in24h.toISOString())
      .in("status", ["published", "active"]);

    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalReminded = 0;

    for (const event of events) {
      // Get confirmed RSVPs that haven't been reminded
      const { data: rsvps, error: rsvpErr } = await supabase
        .from("event_rsvps")
        .select("id, email, name, notes")
        .eq("event_id", event.id)
        .eq("status", "confirmed")
        .not("email", "is", null);

      if (rsvpErr || !rsvps) continue;

      // Check metadata for reminded flag
      for (const rsvp of rsvps) {
        if (!rsvp.email) continue;

        // Check if already reminded via notes field (simple flag)
        if (rsvp.notes?.includes("[REMINDED]")) continue;

        const dateFormatted = new Date(event.starts_at).toLocaleDateString("pt-PT", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Send reminder email
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "event-reminder",
            recipientEmail: rsvp.email,
            idempotencyKey: `event-reminder-${event.id}-${rsvp.id}`,
            templateData: {
              name: rsvp.name || "",
              eventTitle: event.title,
              eventDate: dateFormatted,
              eventLocation: event.location || "",
              eventUrl: `https://fastcrm.lovable.app/dashboard/events/${event.id}`,
            },
          },
        });

        // Mark as reminded
        const existingNotes = rsvp.notes || "";
        await supabase
          .from("event_rsvps")
          .update({ notes: `${existingNotes} [REMINDED]`.trim() })
          .eq("id", rsvp.id);

        totalReminded++;
      }
    }

    console.log(`[EVENT-REMINDER-CRON] Sent ${totalReminded} reminders`);

    return new Response(JSON.stringify({ reminded: totalReminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[EVENT-REMINDER-CRON] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
