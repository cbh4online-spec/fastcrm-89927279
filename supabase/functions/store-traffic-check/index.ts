import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  id: string;
  workspace_id: string;
  metric_type: string;
  threshold_value: number;
  comparison_period_hours: number;
  comparison_type: string;
  cooldown_hours: number;
  notify_email: string | null;
}

const METRIC_LABELS: Record<string, string> = {
  sessions: "Sessões",
  views: "Page Views",
  conversion_rate: "Taxa de Conversão",
  bounce_rate: "Bounce Rate",
  avg_time: "Tempo Médio no Site",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all active rules
    const { data: rules, error: rulesErr } = await supabaseAdmin
      .from("store_traffic_alert_rules")
      .select("*")
      .eq("is_active", true);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No active rules" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertsCreated = 0;

    for (const rule of rules as AlertRule[]) {
      // Check cooldown: skip if an alert was fired within cooldown period
      const cooldownCutoff = new Date(
        Date.now() - rule.cooldown_hours * 60 * 60 * 1000
      ).toISOString();

      const { data: recentAlerts } = await supabaseAdmin
        .from("store_traffic_alerts_log")
        .select("id")
        .eq("rule_id", rule.id)
        .gt("created_at", cooldownCutoff)
        .limit(1);

      if (recentAlerts && recentAlerts.length > 0) continue;

      // Calculate metric value for the comparison period
      const periodCutoff = new Date(
        Date.now() - rule.comparison_period_hours * 60 * 60 * 1000
      ).toISOString();

      const { data: sessions } = await supabaseAdmin
        .from("store_visitor_sessions")
        .select(
          "session_id, pages_viewed, time_on_site_seconds, converted"
        )
        .eq("workspace_id", rule.workspace_id)
        .gte("started_at", periodCutoff);

      if (!sessions) continue;

      let metricValue = 0;
      const totalSessions = sessions.length;

      switch (rule.metric_type) {
        case "sessions":
          metricValue = totalSessions;
          break;
        case "views": {
          const { count } = await supabaseAdmin
            .from("store_page_views")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", rule.workspace_id)
            .gte("created_at", periodCutoff);
          metricValue = count ?? 0;
          break;
        }
        case "conversion_rate":
          if (totalSessions > 0) {
            const converted = sessions.filter(
              (s: any) => s.converted
            ).length;
            metricValue = (converted / totalSessions) * 100;
          }
          break;
        case "bounce_rate":
          if (totalSessions > 0) {
            const bounced = sessions.filter(
              (s: any) => (s.pages_viewed ?? 0) <= 1
            ).length;
            metricValue = (bounced / totalSessions) * 100;
          }
          break;
        case "avg_time":
          if (totalSessions > 0) {
            const totalTime = sessions.reduce(
              (sum: number, s: any) =>
                sum + (s.time_on_site_seconds ?? 0),
              0
            );
            metricValue = totalTime / totalSessions;
          }
          break;
      }

      // Check threshold
      let shouldAlert = false;
      if (rule.comparison_type === "below") {
        shouldAlert = metricValue < rule.threshold_value;
      } else if (rule.comparison_type === "above") {
        shouldAlert = metricValue > rule.threshold_value;
      }

      if (!shouldAlert) continue;

      // Create alert
      const metricLabel = METRIC_LABELS[rule.metric_type] ?? rule.metric_type;
      const direction =
        rule.comparison_type === "below" ? "abaixo" : "acima";
      const message = `⚠️ ${metricLabel} (${metricValue.toFixed(1)}) está ${direction} do threshold (${rule.threshold_value}) nas últimas ${rule.comparison_period_hours}h`;

      const { error: insertErr } = await supabaseAdmin
        .from("store_traffic_alerts_log")
        .insert({
          workspace_id: rule.workspace_id,
          rule_id: rule.id,
          metric_type: rule.metric_type,
          metric_value: metricValue,
          threshold_value: rule.threshold_value,
          comparison_period_hours: rule.comparison_period_hours,
          message,
        });

      if (!insertErr) alertsCreated++;
    }

    return new Response(
      JSON.stringify({
        processed: rules.length,
        alerts_created: alertsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("store-traffic-check error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
