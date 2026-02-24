import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-workspace-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STAGE_LIMIT_DAYS = 14;

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

interface RiskDriver {
  reason: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  penalty: number;
}

function scoreDeal(opp: any, activities: any[], tasks: any[]) {
  const now = new Date();
  const risks: RiskDriver[] = [];

  const lastActivityDate = opp.last_activity_at
    ? new Date(opp.last_activity_at)
    : activities.length > 0
      ? new Date(activities[0].created_at)
      : null;

  const daysSinceActivity = lastActivityDate
    ? differenceInDays(now, lastActivityDate)
    : Infinity;

  if (daysSinceActivity > 14) {
    risks.push({ reason: `No activity in ${daysSinceActivity} days`, severity: "HIGH", penalty: 40 });
  } else if (daysSinceActivity > 7) {
    risks.push({ reason: `No activity in ${daysSinceActivity} days`, severity: "HIGH", penalty: 25 });
  }

  const pendingTasks = tasks.filter((t: any) => t.status === "pending");
  const futureTasks = pendingTasks.filter(
    (t: any) => t.due_at && new Date(t.due_at) > now
  );
  const hasNextStep = pendingTasks.length > 0;

  if (pendingTasks.length === 0) {
    risks.push({ reason: "No next step scheduled", severity: "HIGH", penalty: 20 });
  } else if (futureTasks.length > 0) {
    const nextDue = new Date(futureTasks[0].due_at);
    const daysUntil = differenceInDays(nextDue, now);
    if (daysUntil > 7) {
      risks.push({ reason: `Next task due in ${daysUntil} days`, severity: "MEDIUM", penalty: 10 });
    }
  }

  const daysInStage = differenceInDays(now, new Date(opp.updated_at));
  const stageName = opp.stage_name || "current";

  if (daysInStage > STAGE_LIMIT_DAYS * 2) {
    risks.push({ reason: `Stuck in stage '${stageName}' for ${daysInStage} days`, severity: "HIGH", penalty: 25 });
  } else if (daysInStage > STAGE_LIMIT_DAYS) {
    risks.push({ reason: `In stage '${stageName}' for ${daysInStage} days`, severity: "MEDIUM", penalty: 15 });
  }

  const missingFields: string[] = [];
  if (!opp.value || Number(opp.value) === 0) {
    missingFields.push("amount");
    risks.push({ reason: "Amount not set", severity: "MEDIUM", penalty: 10 });
  }
  if (!opp.expected_close_date) {
    missingFields.push("close_date");
    risks.push({ reason: "Close date not set", severity: "MEDIUM", penalty: 10 });
  }
  if (!opp.contact_id && !opp.lead_id) {
    missingFields.push("primary_contact");
    risks.push({ reason: "No primary contact", severity: "LOW", penalty: 5 });
  }

  const totalCheckedFields = 3;
  const filledCount = totalCheckedFields - missingFields.length;
  const completenessPercent = Math.round((filledCount / totalCheckedFields) * 100);

  const totalPenalty = risks.reduce((sum, r) => sum + r.penalty, 0);
  const healthScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  const healthLabel = healthScore >= 80 ? "HEALTHY" : healthScore >= 50 ? "WATCH" : "AT_RISK";

  const sortedRisks = [...risks].sort((a, b) => b.penalty - a.penalty).slice(0, 3);

  let nba: any;
  if (daysSinceActivity > 7) {
    nba = { title: "Schedule a follow-up within 48h", type: "FOLLOW_UP", priority: "HIGH" };
  } else if (!hasNextStep) {
    nba = { title: "Create next step for this deal", type: "CREATE_TASK", priority: "MEDIUM" };
  } else if (daysInStage > STAGE_LIMIT_DAYS) {
    nba = { title: "Review blockers and advance stage", type: "REVIEW_BLOCKERS", priority: "HIGH" };
  } else if (missingFields.length > 0) {
    nba = { title: "Complete deal details", type: "COMPLETE_DATA", priority: "LOW" };
  } else {
    nba = { title: "Send recap to stakeholders", type: "SEND_RECAP", priority: "LOW" };
  }

  return {
    deal_id: opp.id,
    deal_title: opp.title || opp.name || "Untitled",
    health_score: healthScore,
    health_label: healthLabel,
    risk_drivers: sortedRisks.map((r) => ({ reason: r.reason, severity: r.severity, penalty: r.penalty })),
    next_best_action: nba,
    data_completeness: { percent: completenessPercent, missing_fields: missingFields },
  };
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

    // Fetch all open opportunities for the workspace
    const { data: openOpps, error: oppsError } = await serviceClient
      .from("opportunities")
      .select("*, stage:pipeline_stages(name)")
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
        computed_at: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oppIds = opps.map((o: any) => o.id);

    // Check cache first
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const force = body?.force === true;

    let cachedMap = new Map<string, any>();
    if (!force) {
      const { data: cachedRows } = await serviceClient
        .from("deal_intelligence_cache")
        .select("deal_id, payload")
        .eq("workspace_id", workspaceId)
        .in("deal_id", oppIds)
        .is("invalidated_at", null)
        .gt("expires_at", new Date().toISOString());
      (cachedRows || []).forEach((r: any) => cachedMap.set(r.deal_id, r.payload));
    }

    const missIds = oppIds.filter((id: string) => !cachedMap.has(id));

    // Compute missing deals
    const freshResults: any[] = [];
    if (missIds.length > 0) {
      const [actsRes, tasksRes] = await Promise.all([
        serviceClient
          .from("crm_activities")
          .select("entity_id, created_at")
          .eq("entity_type", "opportunity")
          .in("entity_id", missIds)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        serviceClient
          .from("tasks")
          .select("*")
          .eq("related_type", "opportunity")
          .in("related_id", missIds)
          .eq("workspace_id", workspaceId)
          .order("due_at", { ascending: true, nullsFirst: false }),
      ]);

      const actsByDeal = new Map<string, any[]>();
      (actsRes.data || []).forEach((a: any) => {
        const list = actsByDeal.get(a.entity_id) || [];
        list.push(a);
        actsByDeal.set(a.entity_id, list);
      });

      const tasksByDeal = new Map<string, any[]>();
      (tasksRes.data || []).forEach((t: any) => {
        const list = tasksByDeal.get(t.related_id) || [];
        list.push(t);
        tasksByDeal.set(t.related_id, list);
      });

      opps.filter((o: any) => missIds.includes(o.id)).forEach((opp: any) => {
        const o = { ...opp, stage_name: opp.stage?.name };
        freshResults.push(scoreDeal(o, actsByDeal.get(opp.id) || [], tasksByDeal.get(opp.id) || []));
      });

      // Cache results (fire-and-forget)
      if (freshResults.length > 0) {
        const rows = freshResults.map((r) => ({
          workspace_id: workspaceId,
          deal_id: r.deal_id,
          payload: r,
          computed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          invalidated_at: null,
        }));
        serviceClient.from("deal_intelligence_cache").upsert(rows, { onConflict: "workspace_id,deal_id" });
      }
    }

    // Merge all results
    const allResults: any[] = [
      ...freshResults,
      ...Array.from(cachedMap.values()),
    ];

    // Aggregate
    const distribution = { HEALTHY: 0, WATCH: 0, AT_RISK: 0 };
    let totalScore = 0;
    let dealsMissingValue = 0;
    let dealsMissingCloseDate = 0;
    let totalCompleteness = 0;

    const allRisks: any[] = [];
    const allActions: any[] = [];

    allResults.forEach((r) => {
      distribution[r.health_label as keyof typeof distribution] = (distribution[r.health_label as keyof typeof distribution] || 0) + 1;
      totalScore += r.health_score;
      totalCompleteness += r.data_completeness?.percent || 0;

      if (r.data_completeness?.missing_fields?.includes("amount")) dealsMissingValue++;
      if (r.data_completeness?.missing_fields?.includes("close_date")) dealsMissingCloseDate++;

      // Collect risks from worst deals
      (r.risk_drivers || []).forEach((rd: any) => {
        allRisks.push({
          deal_id: r.deal_id,
          deal_title: r.deal_title,
          reason: rd.reason,
          severity: rd.severity,
          health_score: r.health_score,
        });
      });

      // Collect NBAs
      if (r.next_best_action) {
        allActions.push({
          deal_id: r.deal_id,
          deal_title: r.deal_title,
          action: r.next_best_action.title,
          type: r.next_best_action.type,
          priority: r.next_best_action.priority || "MEDIUM",
        });
      }
    });

    // Sort risks by severity (HIGH first) then health_score (lowest first)
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    allRisks.sort((a, b) => {
      const s = (severityOrder[a.severity as keyof typeof severityOrder] || 2) - (severityOrder[b.severity as keyof typeof severityOrder] || 2);
      if (s !== 0) return s;
      return a.health_score - b.health_score;
    });

    // Sort actions by priority then health_score
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    allActions.sort((a, b) => {
      const p = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      return p;
    });

    const total = allResults.length;
    const response = {
      total_open: total,
      health_distribution: distribution,
      avg_health_score: total > 0 ? Math.round(totalScore / total) : 0,
      top_risks: allRisks.slice(0, 5),
      recommended_actions: allActions.slice(0, 5),
      data_quality: {
        avg_completeness: total > 0 ? Math.round(totalCompleteness / total) : 0,
        deals_missing_value: dealsMissingValue,
        deals_missing_close_date: dealsMissingCloseDate,
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
