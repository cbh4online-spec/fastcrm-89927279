import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workspaceId = req.headers.get("X-Workspace-Id");
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "Missing X-Workspace-Id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Fetch all open opportunities
    const { data: openOpps, error: oppsError } = await serviceClient
      .from("opportunities")
      .select("id, title, stage_id, value, updated_at, status")
      .eq("workspace_id", workspaceId)
      .not("status", "in", '("won","lost","cancelled")');

    if (oppsError) {
      return new Response(JSON.stringify({ error: oppsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const opps = openOpps || [];
    if (opps.length === 0) {
      return new Response(JSON.stringify({
        total_open: 0,
        health_distribution: { HEALTHY: 0, WATCH: 0, AT_RISK: 0 },
        avg_health_score: 0,
        top_risks: [],
        recommended_actions: [],
        data_quality: { avg_completeness: 0, deals_missing_value: 0, deals_missing_close_date: 0 },
        stage_benchmarks: [],
        portfolio_momentum: { deals_with_recent_activity: 0, deals_stale: 0 },
        computed_at: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oppIds = opps.map((o: any) => o.id);

    // --- Call deal-intelligence batch mode via internal HTTP ---
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const force = body?.force === true;

    const batchRes = await fetch(`${supabaseUrl}/functions/v1/deal-intelligence`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "X-Workspace-Id": workspaceId!,
      },
      body: JSON.stringify({ deal_ids: oppIds, force }),
    });

    if (!batchRes.ok) {
      const errText = await batchRes.text();
      throw new Error(`deal-intelligence batch failed: ${errText}`);
    }

    const batchData = await batchRes.json();
    const healthItems: Record<string, any> = batchData.items || {};

    // Also fetch cached full payloads for richer data
    const { data: cachedPayloads } = await serviceClient
      .from("deal_intelligence_cache")
      .select("deal_id, payload")
      .eq("workspace_id", workspaceId)
      .in("deal_id", oppIds)
      .is("invalidated_at", null)
      .gt("expires_at", new Date().toISOString());

    const payloadMap = new Map<string, any>();
    (cachedPayloads || []).forEach((r: any) => payloadMap.set(r.deal_id, r.payload));

    // Fetch stages for benchmarks
    const { data: stagesData } = await serviceClient
      .from("pipeline_stages")
      .select("id, name, expected_days")
      .eq("workspace_id", workspaceId);

    // Aggregate
    const distribution = { HEALTHY: 0, WATCH: 0, AT_RISK: 0 };
    let totalScore = 0;
    let dealsMissingValue = 0;
    let dealsMissingCloseDate = 0;
    let totalCompleteness = 0;
    let dealsWithRecentActivity = 0;
    let dealsStale = 0;

    const stageDealDays = new Map<string, number[]>();
    const allRisks: any[] = [];
    const allActions: any[] = [];

    opps.forEach((opp: any) => {
      const h = healthItems[opp.id];
      const payload = payloadMap.get(opp.id);
      
      if (!h) return;

      const label = h.health_label as keyof typeof distribution;
      distribution[label] = (distribution[label] || 0) + 1;
      totalScore += h.health_score;

      // Use payload for richer data, fallback to h
      const dc = payload?.data_completeness;
      if (dc) {
        totalCompleteness += dc.percent || 0;
        if (dc.missing_fields?.includes("amount")) dealsMissingValue++;
        if (dc.missing_fields?.includes("close_date")) dealsMissingCloseDate++;
      }

      if (payload?.has_recent_activity) dealsWithRecentActivity++;
      else dealsStale++;

      // Risk drivers
      const drivers = payload?.risk_drivers || [];
      drivers.forEach((rd: any) => {
        allRisks.push({
          deal_id: opp.id,
          deal_title: payload?.deal_title || opp.title,
          reason: rd.reason,
          severity: rd.severity,
          health_score: h.health_score,
        });
      });

      // NBA
      const nba = payload?.next_best_action;
      if (nba) {
        allActions.push({
          deal_id: opp.id,
          deal_title: payload?.deal_title || opp.title,
          action: nba.title,
          type: nba.type,
          priority: nba.payload?.suggested_priority || "MEDIUM",
        });
      }

      // Stage days
      if (opp.stage_id) {
        const days = differenceInDays(new Date(), new Date(opp.updated_at));
        const list = stageDealDays.get(opp.stage_id) || [];
        list.push(days);
        stageDealDays.set(opp.stage_id, list);
      }
    });

    const stageBenchmarks = (stagesData || []).map((s: any) => {
      const dealDays = stageDealDays.get(s.id) || [];
      const avgDays = dealDays.length > 0 ? Math.round(dealDays.reduce((a: number, b: number) => a + b, 0) / dealDays.length) : null;
      return {
        stage_id: s.id,
        stage_name: s.name,
        expected_days: s.expected_days ?? 14,
        avg_days: avgDays,
        deals_count: dealDays.length,
      };
    });

    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    allRisks.sort((a, b) => {
      const s = (severityOrder[a.severity as keyof typeof severityOrder] || 2) - (severityOrder[b.severity as keyof typeof severityOrder] || 2);
      if (s !== 0) return s;
      return a.health_score - b.health_score;
    });

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    allActions.sort((a, b) => {
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    });

    const total = Object.keys(healthItems).length || opps.length;
    const response = {
      total_open: opps.length,
      health_distribution: distribution,
      avg_health_score: total > 0 ? Math.round(totalScore / total) : 0,
      top_risks: allRisks.slice(0, 5),
      recommended_actions: allActions.slice(0, 5),
      data_quality: {
        avg_completeness: total > 0 ? Math.round(totalCompleteness / total) : 0,
        deals_missing_value: dealsMissingValue,
        deals_missing_close_date: dealsMissingCloseDate,
      },
      stage_benchmarks: stageBenchmarks,
      portfolio_momentum: {
        deals_with_recent_activity: dealsWithRecentActivity,
        deals_stale: dealsStale,
      },
      computed_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
