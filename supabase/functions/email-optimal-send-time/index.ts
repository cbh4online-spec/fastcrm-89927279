import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify membership
    const { data: member } = await supabase.from("workspace_members").select("id").eq("workspace_id", workspace_id).eq("user_id", claimsData.claims.sub).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all open events
    const { data: openEvents } = await supabase
      .from("marketing_events")
      .select("email, occurred_at")
      .eq("workspace_id", workspace_id)
      .eq("event_type", "opened")
      .order("occurred_at", { ascending: false })
      .limit(1000);

    if (!openEvents || openEvents.length === 0) {
      return new Response(JSON.stringify({ computed: 0, message: "No open data available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by email
    const emailOpenMap = new Map<string, Date[]>();
    for (const event of openEvents) {
      if (!event.email) continue;
      const key = event.email.toLowerCase();
      if (!emailOpenMap.has(key)) emailOpenMap.set(key, []);
      emailOpenMap.get(key)!.push(new Date(event.occurred_at));
    }

    let computed = 0;

    for (const [email, dates] of emailOpenMap) {
      if (dates.length < 5) continue; // Need at least 5 opens

      // Find most common hour
      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      for (const d of dates) {
        hourCounts[d.getUTCHours()]++;
        dayCounts[d.getUTCDay()]++;
      }

      const preferredHour = hourCounts.indexOf(Math.max(...hourCounts));
      const preferredDay = dayCounts.indexOf(Math.max(...dayCounts));
      const openRateScore = dates.length;

      // Find contact
      const { data: contact } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("email", email)
        .maybeSingle();

      if (!contact) continue;

      // Upsert
      const { error: upsertErr } = await supabase
        .from("contact_send_time_profile")
        .upsert({
          workspace_id,
          contact_id: contact.id,
          preferred_hour: preferredHour,
          preferred_day_of_week: preferredDay,
          open_rate_score: openRateScore,
          last_computed_at: new Date().toISOString(),
        }, { onConflict: "workspace_id,contact_id" });

      if (!upsertErr) computed++;
    }

    return new Response(JSON.stringify({ computed, total_emails: emailOpenMap.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Optimal send time error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
