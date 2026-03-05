import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, bot_id, user_message, conversation_id } = await req.json();
    console.log(`[BOOKING-ROUTER] Request: workspace=${workspace_id} bot=${bot_id} conversation=${conversation_id}`);

    if (!workspace_id || !bot_id || !user_message) {
      console.warn("[BOOKING-ROUTER] Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch booking calendars for this bot
    const { data: calendars, error: calErr } = await supabaseAdmin
      .from("ai_booking_calendars")
      .select("*")
      .eq("bot_id", bot_id)
      .eq("workspace_id", workspace_id);

    if (calErr) throw calErr;
    if (!calendars || calendars.length === 0) {
      console.log("[BOOKING-ROUTER] No calendars configured for bot");
      return new Response(JSON.stringify({ matched: false, reason: "no_calendars_configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use AI to classify user message against calendars
    const calendarDescriptions = calendars.map((c: any) => ({
      id: c.id,
      calendar_id: c.calendar_id,
      name: c.calendar_name,
      description: c.description || "",
      keywords: c.keywords || [],
      is_fallback: c.is_fallback,
      allow_cancel: c.allow_cancel,
      post_booking_actions: c.post_booking_actions,
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a booking router. Given a user message, determine which calendar best matches the user's booking intent. Respond with ONLY the calendar id (the "id" field) or "none" if no calendar matches.

Available calendars:
${JSON.stringify(calendarDescriptions, null, 2)}`
          },
          { role: "user", content: user_message }
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.warn(`[BOOKING-ROUTER] AI_CLASSIFY_FAILED: HTTP ${aiResp.status} - ${errText}`);
      // Fallback to default calendar
      const fallback = calendars.find((c: any) => c.is_fallback) || calendars[0];
      console.log(`[BOOKING-ROUTER] Fallback to calendar: ${fallback.calendar_name}`);
      return new Response(JSON.stringify({
        matched: false,
        fallback_calendar_id: fallback.calendar_id,
        calendar_name: fallback.calendar_name,
        post_booking_actions: fallback.post_booking_actions,
        allow_cancel: fallback.allow_cancel,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    const matchedId = aiData.choices?.[0]?.message?.content?.trim();

    const matchedCalendar = calendars.find((c: any) => c.id === matchedId);

    if (matchedCalendar) {
      console.log(`[BOOKING-ROUTER] Matched calendar: ${matchedCalendar.calendar_name} (${matchedCalendar.id})`);
      return new Response(JSON.stringify({
        matched: true,
        calendar_id: matchedCalendar.calendar_id,
        calendar_name: matchedCalendar.calendar_name,
        post_booking_actions: matchedCalendar.post_booking_actions,
        allow_cancel: matchedCalendar.allow_cancel,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // No match — use fallback
    const fallback = calendars.find((c: any) => c.is_fallback) || calendars[0];
    console.log(`[BOOKING-ROUTER] No match, fallback to: ${fallback.calendar_name}`);
    return new Response(JSON.stringify({
      matched: false,
      fallback_calendar_id: fallback.calendar_id,
      calendar_name: fallback.calendar_name,
      post_booking_actions: fallback.post_booking_actions,
      allow_cancel: fallback.allow_cancel,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.warn("[BOOKING-ROUTER] ERROR:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
