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

interface RiskDriver {
  reason: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  penalty: number;
}

function scoreDeal(
  opp: any,
  activities: any[],
  tasks: any[],
  expectedDays = 14
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

  // Stage stagnation — benchmark-aware
  const daysInStage = differenceInDays(now, new Date(opp.updated_at));
  const stageName = opp.stage_name || "current";

  if (daysInStage > expectedDays * 2) {
    risks.push({ reason: `Stuck in stage '${stageName}' for ${daysInStage} days`, severity: "HIGH", penalty: 20 });
  } else if (daysInStage > expectedDays) {
    risks.push({ reason: `In stage '${stageName}' for ${daysInStage} days`, severity: "MEDIUM", penalty: 10 });
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

  // Deal momentum: +5 if ≥2 activities in last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const recentActivityCount = activities.filter(
    (a) => new Date(a.created_at) >= sevenDaysAgo
  ).length;
  const momentumBonus = recentActivityCount >= 2 ? 5 : 0;

  // Score
  const totalPenalty = risks.reduce((sum, r) => sum + r.penalty, 0);
  const healthScore = Math.max(0, Math.min(100, 100 - totalPenalty + momentumBonus));
  const healthLabel = healthScore >= 80 ? "HEALTHY" : healthScore >= 50 ? "WATCH" : "AT_RISK";

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
  } else if (daysInStage > expectedDays) {
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
      momentum_bonus: momentumBonus,
    },
    top_reason: sortedRisks.length > 0 ? sortedRisks[0].reason : null,
  };
}

function buildAutomationSuggestions(opp: any, hasNextStep: boolean, daysSinceActivity: number, healthScore: number, daysInStage: number) {
  const suggestions: Array<{ title: string; template_id: string; reason: string }> = [];

  if (!hasNextStep) {
    suggestions.push({
      title: "Auto-create follow-up when stage changes",
      template_id: "opportunity-stage-tasks",
      reason: "No next step detected",
    });
  }

  if (daysSinceActivity > 3) {
    suggestions.push({
      title: "Nudge owner after days inactive",
      template_id: "opportunity-stale-alert",
      reason: `No activity in ${Math.round(daysSinceActivity)} days`,
    });
  }

  if (opp.expected_close_date) {
    const daysToClose = differenceInDays(new Date(opp.expected_close_date), new Date());
    if (daysToClose <= 7 && daysToClose > 0 && healthScore < 50) {
      suggestions.push({
        title: "Escalate: close date approaching with low health",
        template_id: "opportunity-close-escalation",
        reason: `Close date in ${daysToClose} days, health ${healthScore}`,
      });
    }
  }

  return suggestions.slice(0, 3);
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
    const body = await req.json();
    const force = body.force === true;

    // Fetch stage benchmarks for the workspace
    const { data: stagesData } = await serviceClient
      .from("pipeline_stages")
      .select("id, expected_days")
      .eq("workspace_id", workspaceId);

    const stageExpectedDays = new Map<string, number>();
    (stagesData || []).forEach((s: any) => stageExpectedDays.set(s.id, s.expected_days ?? 14));

    // ---------- helpers ----------
    async function cacheGet(ids: string[]) {
      if (force || ids.length === 0) return new Map<string, any>();
      const { data } = await serviceClient
        .from("deal_intelligence_cache")
        .select("deal_id, payload")
        .eq("workspace_id", workspaceId)
        .in("deal_id", ids)
        .is("invalidated_at", null)
        .gt("expires_at", new Date().toISOString());
      const map = new Map<string, any>();
      (data || []).forEach((r: any) => map.set(r.deal_id, r.payload));
      return map;
    }

    async function cacheSet(results: { deal_id: string; [k: string]: any }[]) {
      if (results.length === 0) return;
      const rows = results.map((r) => ({
        workspace_id: workspaceId,
        deal_id: r.deal_id,
        payload: r,
        computed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        invalidated_at: null,
      }));
      await serviceClient
        .from("deal_intelligence_cache")
        .upsert(rows, { onConflict: "workspace_id,deal_id" });
    }

    // ---------- Single deal mode ----------
    if (body.deal_id) {
      const dealId = body.deal_id;

      const cached = await cacheGet([dealId]);
      if (cached.has(dealId)) {
        return new Response(JSON.stringify(cached.get(dealId)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [oppRes, actRes, taskRes] = await Promise.all([
        serviceClient
          .from("opportunities")
          .select("*, stage:pipeline_stages(name, expected_days)")
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

      const stageExpDays = oppRes.data.stage?.expected_days ?? stageExpectedDays.get(oppRes.data.stage_id) ?? 14;
      const opp = { ...oppRes.data, stage_name: oppRes.data.stage?.name };
      const activities = actRes.data || [];
      const result = scoreDeal(opp, activities, taskRes.data || [], stageExpDays);

      // Historical insights
      const daysInStage = result.debug.stage_days;
      const historicalInsights: Array<{ text: string; severity: string }> = [];

      // Compute avg stage days from historical data
      let avgStageDays: number | null = null;
      try {
        const { data: stageActivities } = await serviceClient
          .from("crm_activities")
          .select("entity_id, created_at")
          .eq("workspace_id", workspaceId)
          .eq("activity_type", "stage_changed")
          .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString())
          .limit(500);

        if (stageActivities && stageActivities.length >= 3) {
          // Group by entity_id to get transitions
          const dealTimes = new Map<string, Date[]>();
          stageActivities.forEach((a: any) => {
            const list = dealTimes.get(a.entity_id) || [];
            list.push(new Date(a.created_at));
            dealTimes.set(a.entity_id, list);
          });
          // Average gap between transitions
          let totalDays = 0;
          let count = 0;
          dealTimes.forEach((dates) => {
            dates.sort((a, b) => a.getTime() - b.getTime());
            for (let i = 1; i < dates.length; i++) {
              totalDays += differenceInDays(dates[i], dates[i - 1]);
              count++;
            }
          });
          if (count >= 3) {
            avgStageDays = Math.round(totalDays / count);
          }
        }
      } catch { /* ignore */ }

      const refDays = avgStageDays ?? stageExpDays;
      if (daysInStage > refDays) {
        const severity = daysInStage > refDays * 1.5 ? "MEDIUM" : "LOW";
        historicalInsights.push({
          text: `This stage usually moves in ${refDays} days. You're at ${daysInStage}.`,
          severity,
        });
      }

      // Avg cycle length for won deals
      try {
        const { data: wonDeals } = await serviceClient
          .from("opportunities")
          .select("created_at, updated_at")
          .eq("workspace_id", workspaceId)
          .eq("status", "won")
          .limit(50);
        if (wonDeals && wonDeals.length >= 3) {
          const avgCycle = Math.round(
            wonDeals.reduce((sum, d) => sum + differenceInDays(new Date(d.updated_at), new Date(d.created_at)), 0) / wonDeals.length
          );
          historicalInsights.push({
            text: `Deals like this close in ~${avgCycle} days on average.`,
            severity: "LOW",
          });
        }
      } catch { /* ignore */ }

      if (historicalInsights.length === 0) {
        historicalInsights.push({
          text: "Not enough historical data yet — using configured defaults.",
          severity: "LOW",
        });
      }

      // Automation suggestions
      const daysSinceAct = result.debug.last_activity_days ?? Infinity;
      const automationSuggestions = buildAutomationSuggestions(
        opp, result.debug.has_next_step, daysSinceAct, result.health_score, daysInStage
      );

      const fullResult = {
        ...result,
        benchmarks: {
          expected_stage_days: stageExpDays,
          avg_stage_days: avgStageDays,
          deal_stage_days: daysInStage,
        },
        historical_insights: historicalInsights.slice(0, 2),
        automation_suggestions: automationSuggestions,
      };

      cacheSet([fullResult]);

      return new Response(JSON.stringify(fullResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Batch mode ----------
    if (body.deal_ids && Array.isArray(body.deal_ids)) {
      const dealIds: string[] = body.deal_ids.slice(0, 50);
      if (dealIds.length === 0) {
        return new Response(JSON.stringify({ items: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cached = await cacheGet(dealIds);
      const missIds = dealIds.filter((id) => !cached.has(id));

      let freshItems: Record<string, any> = {};

      if (missIds.length > 0) {
        const [oppsRes, actsRes, tasksRes] = await Promise.all([
          serviceClient
            .from("opportunities")
            .select("*, stage:pipeline_stages(name, expected_days)")
            .in("id", missIds)
            .eq("workspace_id", workspaceId),
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

        const toCache: any[] = [];
        (oppsRes.data || []).forEach((opp: any) => {
          const expDays = opp.stage?.expected_days ?? stageExpectedDays.get(opp.stage_id) ?? 14;
          const o = { ...opp, stage_name: opp.stage?.name };
          const result = scoreDeal(o, actsByDeal.get(opp.id) || [], tasksByDeal.get(opp.id) || [], expDays);
          freshItems[opp.id] = {
            health_score: result.health_score,
            health_label: result.health_label,
            top_reason: result.top_reason,
          };
          toCache.push(result);
        });

        cacheSet(toCache);
      }

      const items: Record<string, any> = {};
      dealIds.forEach((id) => {
        if (cached.has(id)) {
          const c = cached.get(id);
          items[id] = {
            health_score: c.health_score,
            health_label: c.health_label,
            top_reason: c.top_reason,
          };
        } else if (freshItems[id]) {
          items[id] = freshItems[id];
        }
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
