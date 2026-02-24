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

function scoreDeal(
  opp: any,
  activities: any[],
  tasks: any[]
) {
  const now = new Date();
  const risks: RiskDriver[] = [];

  // Activity recency
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

  // Next step / tasks
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

  // Stage stagnation
  const daysInStage = differenceInDays(now, new Date(opp.updated_at));
  const stageName = opp.stage_name || "current";

  if (daysInStage > STAGE_LIMIT_DAYS * 2) {
    risks.push({ reason: `Stuck in stage '${stageName}' for ${daysInStage} days`, severity: "HIGH", penalty: 25 });
  } else if (daysInStage > STAGE_LIMIT_DAYS) {
    risks.push({ reason: `In stage '${stageName}' for ${daysInStage} days`, severity: "MEDIUM", penalty: 15 });
  }

  // Data completeness
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

  // Score
  const totalPenalty = risks.reduce((sum, r) => sum + r.penalty, 0);
  const healthScore = Math.max(0, Math.min(100, 100 - totalPenalty));
  const healthLabel = healthScore >= 80 ? "HEALTHY" : healthScore >= 50 ? "WATCH" : "AT_RISK";

  // Sort risks by penalty desc, top 3
  const sortedRisks = [...risks].sort((a, b) => b.penalty - a.penalty).slice(0, 3);

  // NBA
  let nba: any;
  if (daysSinceActivity > 7) {
    nba = {
      title: "Schedule a follow-up within 48h",
      type: "FOLLOW_UP",
      payload: { suggested_due_days: 2, suggested_title: "Follow up on deal", suggested_priority: "HIGH" },
    };
  } else if (!hasNextStep) {
    nba = {
      title: "Create next step for this deal",
      type: "CREATE_TASK",
      payload: { suggested_due_days: 3, suggested_title: "Next step for deal", suggested_priority: "MEDIUM" },
    };
  } else if (daysInStage > STAGE_LIMIT_DAYS) {
    nba = {
      title: "Review blockers and advance stage",
      type: "REVIEW_BLOCKERS",
      payload: { suggested_due_days: 1, suggested_title: "Review blockers", suggested_priority: "HIGH" },
    };
  } else if (missingFields.length > 0) {
    nba = {
      title: "Complete deal details",
      type: "COMPLETE_DATA",
      payload: { suggested_due_days: 2, suggested_title: "Complete deal data", suggested_priority: "LOW" },
    };
  } else {
    nba = {
      title: "Send recap to stakeholders",
      type: "SEND_RECAP",
      payload: { suggested_due_days: 3, suggested_title: "Send deal recap", suggested_priority: "LOW" },
    };
  }

  return {
    deal_id: opp.id,
    health_score: healthScore,
    health_label: healthLabel,
    risk_drivers: sortedRisks.map((r) => ({ reason: r.reason, severity: r.severity })),
    next_best_action: nba,
    data_completeness: { percent: completenessPercent, missing_fields: missingFields },
    debug: {
      last_activity_days: daysSinceActivity === Infinity ? null : daysSinceActivity,
      has_next_step: hasNextStep,
      stage_days: daysInStage,
    },
    top_reason: sortedRisks.length > 0 ? sortedRisks[0].reason : null,
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

    // Validate user
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
    const body = await req.json();

    // Single deal mode
    if (body.deal_id) {
      const dealId = body.deal_id;

      const [oppRes, actRes, taskRes] = await Promise.all([
        serviceClient
          .from("opportunities")
          .select("*, stage:pipeline_stages(name)")
          .eq("id", dealId)
          .eq("workspace_id", workspaceId)
          .single(),
        serviceClient
          .from("crm_activities")
          .select("created_at")
          .eq("entity_type", "opportunity")
          .eq("entity_id", dealId)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false })
          .limit(50),
        serviceClient
          .from("tasks")
          .select("*")
          .eq("related_type", "opportunity")
          .eq("related_id", dealId)
          .eq("workspace_id", workspaceId)
          .order("due_at", { ascending: true, nullsFirst: false }),
      ]);

      if (oppRes.error || !oppRes.data) {
        return new Response(JSON.stringify({ error: "Deal not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const opp = { ...oppRes.data, stage_name: oppRes.data.stage?.name };
      const result = scoreDeal(opp, actRes.data || [], taskRes.data || []);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch mode
    if (body.deal_ids && Array.isArray(body.deal_ids)) {
      const dealIds = body.deal_ids.slice(0, 50);
      if (dealIds.length === 0) {
        return new Response(JSON.stringify({ items: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [oppsRes, actsRes, tasksRes] = await Promise.all([
        serviceClient
          .from("opportunities")
          .select("*, stage:pipeline_stages(name)")
          .in("id", dealIds)
          .eq("workspace_id", workspaceId),
        serviceClient
          .from("crm_activities")
          .select("entity_id, created_at")
          .eq("entity_type", "opportunity")
          .in("entity_id", dealIds)
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false }),
        serviceClient
          .from("tasks")
          .select("*")
          .eq("related_type", "opportunity")
          .in("related_id", dealIds)
          .eq("workspace_id", workspaceId)
          .order("due_at", { ascending: true, nullsFirst: false }),
      ]);

      // Group activities and tasks by deal
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

      const items: Record<string, any> = {};
      (oppsRes.data || []).forEach((opp: any) => {
        const o = { ...opp, stage_name: opp.stage?.name };
        const result = scoreDeal(o, actsByDeal.get(opp.id) || [], tasksByDeal.get(opp.id) || []);
        items[opp.id] = {
          health_score: result.health_score,
          health_label: result.health_label,
          top_reason: result.top_reason,
        };
      });

      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Provide deal_id or deal_ids" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
