import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    // Default: yesterday. Can pass target_date for backfill.
    const targetDate = body.target_date || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayStart = `${targetDate}T00:00:00.000Z`;
    const dayEnd = `${targetDate}T23:59:59.999Z`;

    console.log(`[sdr-stats-aggregator] Aggregating stats for ${targetDate}`);

    // Get all active campaigns
    const { data: campaigns, error: campErr } = await supabase
      .from("sdr_campaigns")
      .select("id, workspace_id");

    if (campErr) throw campErr;
    if (!campaigns?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let upserted = 0;

    for (const campaign of campaigns) {
      // Count enrollments created on this day
      const { count: enrolled } = await supabase
        .from("sdr_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      // Get enrollment IDs for this campaign
      const { data: allEnrollments } = await supabase
        .from("sdr_enrollments")
        .select("id")
        .eq("campaign_id", campaign.id);

      const enrollmentIds = (allEnrollments || []).map((e: any) => e.id);

      let sent = 0, opened = 0, clicked = 0, replied = 0;

      if (enrollmentIds.length > 0) {
        // Process in batches to avoid query limits
        const batchSize = 200;
        for (let i = 0; i < enrollmentIds.length; i += batchSize) {
          const batch = enrollmentIds.slice(i, i + batchSize);

          const { data: logs } = await supabase
            .from("sdr_sequence_step_logs")
            .select("status, sent_at, opened_at, clicked_at, replied_at")
            .in("sdr_enrollment_id", batch)
            .or(`sent_at.gte.${dayStart},opened_at.gte.${dayStart},clicked_at.gte.${dayStart},replied_at.gte.${dayStart}`)
            .or(`sent_at.lte.${dayEnd},opened_at.lte.${dayEnd},clicked_at.lte.${dayEnd},replied_at.lte.${dayEnd}`);

          for (const log of logs || []) {
            if (log.sent_at && log.sent_at >= dayStart && log.sent_at <= dayEnd) sent++;
            if (log.opened_at && log.opened_at >= dayStart && log.opened_at <= dayEnd) opened++;
            if (log.clicked_at && log.clicked_at >= dayStart && log.clicked_at <= dayEnd) clicked++;
            if (log.replied_at && log.replied_at >= dayStart && log.replied_at <= dayEnd) replied++;
          }
        }
      }

      // Count status changes on this day
      const countStatus = async (field: string) => {
        const { count } = await supabase
          .from("sdr_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .gte(field, dayStart)
          .lte(field, dayEnd);
        return count || 0;
      };

      const meetings = await countStatus("meeting_set_at");
      const converted = await countStatus("converted_at");
      const optedOut = await countStatus("opted_out_at");

      // Upsert daily stats
      const { error: upsertErr } = await supabase
        .from("sdr_daily_stats")
        .upsert(
          {
            campaign_id: campaign.id,
            workspace_id: campaign.workspace_id,
            stat_date: targetDate,
            enrolled: enrolled || 0,
            sent,
            opened,
            clicked,
            replied,
            meetings,
            converted,
            opted_out: optedOut,
          },
          { onConflict: "campaign_id,stat_date" }
        );

      if (upsertErr) {
        console.error(`[sdr-stats-aggregator] Error upserting for campaign ${campaign.id}:`, upsertErr);
      } else {
        upserted++;
      }
    }

    console.log(`[sdr-stats-aggregator] Done: ${upserted}/${campaigns.length} campaigns`);

    return new Response(JSON.stringify({ success: true, processed: upserted, date: targetDate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sdr-stats-aggregator] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
