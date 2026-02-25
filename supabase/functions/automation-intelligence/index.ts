import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey);

    // Get workspaces with sufficient data
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id");

    if (!workspaces?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalGenerated = 0;

    for (const ws of workspaces) {
      const generated = await processWorkspace(admin, ws.id);
      totalGenerated += generated;
    }

    return new Response(JSON.stringify({ processed: workspaces.length, generated: totalGenerated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("automation-intelligence error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processWorkspace(admin: any, workspaceId: string): Promise<number> {
  // Guardrail 1: Check pending count
  const { count: pendingCount } = await admin
    .from("automation_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "pending");

  if ((pendingCount ?? 0) >= 5) return 0;

  // Guardrail 2: Get recently dismissed pattern types (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: dismissed } = await admin
    .from("automation_suggestions")
    .select("detected_pattern_type")
    .eq("workspace_id", workspaceId)
    .eq("status", "dismissed")
    .gte("reviewed_at", thirtyDaysAgo)
    .not("detected_pattern_type", "is", null);

  const dismissedTypes = new Set((dismissed || []).map((d: any) => d.detected_pattern_type));

  // Also check existing pending pattern types to avoid duplicates
  const { data: existingPending } = await admin
    .from("automation_suggestions")
    .select("detected_pattern_type")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .not("detected_pattern_type", "is", null);

  const existingTypes = new Set((existingPending || []).map((d: any) => d.detected_pattern_type));

  // Expire old pending suggestions (>30 days)
  await admin
    .from("automation_suggestions")
    .update({ status: "expired" })
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .lt("created_at", thirtyDaysAgo);

  const suggestions: any[] = [];
  const remaining = 5 - (pendingCount ?? 0);

  // Pattern 1: Repetitive Task
  if (!dismissedTypes.has("repetitive_task") && !existingTypes.has("repetitive_task") && suggestions.length < remaining) {
    const s = await detectRepetitiveTask(admin, workspaceId);
    if (s) suggestions.push(s);
  }

  // Pattern 2: Stage Risk
  if (!dismissedTypes.has("stage_risk") && !existingTypes.has("stage_risk") && suggestions.length < remaining) {
    const s = await detectStageRisk(admin, workspaceId);
    if (s) suggestions.push(s);
  }

  // Pattern 3: No Activity
  if (!dismissedTypes.has("no_activity") && !existingTypes.has("no_activity") && suggestions.length < remaining) {
    const s = await detectNoActivity(admin, workspaceId);
    if (s) suggestions.push(s);
  }

  // Pattern 4: Invoice Delay
  if (!dismissedTypes.has("invoice_delay") && !existingTypes.has("invoice_delay") && suggestions.length < remaining) {
    const s = await detectInvoiceDelay(admin, workspaceId);
    if (s) suggestions.push(s);
  }

  // Insert suggestions
  if (suggestions.length > 0) {
    await admin.from("automation_suggestions").insert(
      suggestions.map((s) => ({
        workspace_id: workspaceId,
        title: s.title,
        description: s.description,
        trigger_type: s.trigger_type,
        trigger_config: s.trigger_config,
        conditions: s.conditions,
        actions: s.actions,
        confidence: s.confidence,
        explanation: s.explanation,
        pattern_data: s.pattern_data,
        detected_pattern_type: s.detected_pattern_type,
        status: "pending",
      }))
    );
  }

  return suggestions.length;
}

// ---------- Pattern 1: Repetitive Task ----------
async function detectRepetitiveTask(admin: any, workspaceId: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  const { data: tasks } = await admin.rpc("get_repetitive_tasks_for_workspace", {
    p_workspace_id: workspaceId,
    p_since: ninetyDaysAgo,
    p_min_count: 5,
  });

  // Fallback: direct query if RPC doesn't exist
  if (!tasks || tasks.length === 0) {
    const { data: rawTasks } = await admin
      .from("tasks")
      .select("title")
      .eq("workspace_id", workspaceId)
      .gte("created_at", ninetyDaysAgo);

    if (!rawTasks || rawTasks.length === 0) return null;

    // Group by title
    const titleCounts: Record<string, number> = {};
    for (const t of rawTasks) {
      const normalized = (t.title || "").toLowerCase().trim();
      if (normalized.length < 3) continue;
      titleCounts[normalized] = (titleCounts[normalized] || 0) + 1;
    }

    const topTitle = Object.entries(titleCounts)
      .filter(([, cnt]) => cnt > 5)
      .sort((a, b) => b[1] - a[1])[0];

    if (!topTitle) return null;

    const [title, count] = topTitle;
    const confidence = Math.min(1.0, count / 10);
    if (confidence < 0.7) return null;

    return {
      title: `Automate "${title}" task creation`,
      description: `You've created "${title}" ${count} times in the last 90 days. This task could be automated.`,
      trigger_type: "stage_changed",
      trigger_config: {},
      conditions: [],
      actions: [{ action_type: "create_task", config: { title, due_in_days: 3 } }],
      confidence,
      explanation: `Detected ${count} manually created tasks with title "${title}" in the last 90 days.`,
      pattern_data: { title, count, period_days: 90 },
      detected_pattern_type: "repetitive_task",
    };
  }

  return null;
}

// ---------- Pattern 2: Stage Risk ----------
async function detectStageRisk(admin: any, workspaceId: string) {
  // Get open deals with health data
  const { data: deals } = await admin
    .from("opportunities")
    .select("id, stage_id, pipeline_stages(name, expected_days)")
    .eq("workspace_id", workspaceId)
    .eq("status", "open");

  if (!deals || deals.length < 5) return null;

  // Get health cache for these deals
  const dealIds = deals.map((d: any) => d.id);
  const { data: healthData } = await admin
    .from("deal_intelligence_cache")
    .select("deal_id, health_label")
    .in("deal_id", dealIds);

  if (!healthData || healthData.length === 0) return null;

  const healthMap: Record<string, string> = {};
  for (const h of healthData) {
    healthMap[h.deal_id] = h.health_label;
  }

  // Group by stage
  const stageStats: Record<string, { name: string; total: number; atRisk: number; expectedDays: number | null }> = {};
  for (const d of deals) {
    const stageId = d.stage_id;
    if (!stageId) continue;
    const stageName = d.pipeline_stages?.name || "Unknown";
    const expectedDays = d.pipeline_stages?.expected_days || null;

    if (!stageStats[stageId]) {
      stageStats[stageId] = { name: stageName, total: 0, atRisk: 0, expectedDays };
    }
    stageStats[stageId].total++;
    if (healthMap[d.id] === "AT_RISK") {
      stageStats[stageId].atRisk++;
    }
  }

  // Find stage with >40% at risk
  let worstStage: { id: string; name: string; ratio: number; expectedDays: number | null } | null = null;
  for (const [id, stats] of Object.entries(stageStats)) {
    if (stats.total < 3) continue;
    const ratio = stats.atRisk / stats.total;
    if (ratio > 0.4 && (!worstStage || ratio > worstStage.ratio)) {
      worstStage = { id, name: stats.name, ratio, expectedDays: stats.expectedDays };
    }
  }

  if (!worstStage || worstStage.ratio < 0.7) return null;

  const followUpDays = worstStage.expectedDays ? Math.ceil(worstStage.expectedDays * 0.7) : 7;

  return {
    title: `Add follow-up in "${worstStage.name}" stage`,
    description: `${Math.round(worstStage.ratio * 100)}% of deals in "${worstStage.name}" become at-risk. A follow-up after ${followUpDays} days could help.`,
    trigger_type: "stage_changed",
    trigger_config: { stage_id: worstStage.id },
    conditions: [{ field_name: "stage", operator: "equals", value: worstStage.name }],
    actions: [{ action_type: "create_task", config: { title: `Follow up on deal in ${worstStage.name}`, due_in_days: followUpDays } }],
    confidence: worstStage.ratio,
    explanation: `${Math.round(worstStage.ratio * 100)}% of deals in "${worstStage.name}" stage are at risk. Automated follow-ups could reduce this.`,
    pattern_data: { stage_id: worstStage.id, stage_name: worstStage.name, at_risk_ratio: worstStage.ratio },
    detected_pattern_type: "stage_risk",
  };
}

// ---------- Pattern 3: No Activity ----------
async function detectNoActivity(admin: any, workspaceId: string) {
  const { data: deals } = await admin
    .from("opportunities")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "open");

  if (!deals || deals.length < 5) return null;

  const dealIds = deals.map((d: any) => d.id);
  const { data: healthData } = await admin
    .from("deal_intelligence_cache")
    .select("deal_id, payload")
    .in("deal_id", dealIds);

  if (!healthData) return null;

  let staleCount = 0;
  for (const h of healthData) {
    const lastActivityDays = h.payload?.last_activity_days ?? h.payload?.signals?.last_activity_days;
    if (lastActivityDays != null && lastActivityDays > 10) {
      staleCount++;
    }
  }

  const total = deals.length;
  const ratio = staleCount / total;

  if (ratio < 0.3) return null;

  const confidence = Math.min(1.0, ratio + 0.3);
  if (confidence < 0.7) return null;

  return {
    title: "Auto-remind stale deals",
    description: `${Math.round(ratio * 100)}% of open deals have no activity for over 10 days. Automated reminders can help.`,
    trigger_type: "no_activity",
    trigger_config: { days_threshold: 10 },
    conditions: [],
    actions: [{ action_type: "create_task", config: { title: "Follow up — no recent activity", due_in_days: 1 } }],
    confidence,
    explanation: `${staleCount} of ${total} open deals have been inactive for more than 10 days.`,
    pattern_data: { stale_count: staleCount, total_deals: total, ratio },
    detected_pattern_type: "no_activity",
  };
}

// ---------- Pattern 4: Invoice Delay ----------
async function detectInvoiceDelay(admin: any, workspaceId: string) {
  const { data: invoices } = await admin
    .from("invoices")
    .select("id, due_date, paid_at, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "paid")
    .not("paid_at", "is", null)
    .not("due_date", "is", null);

  if (!invoices || invoices.length < 5) return null;

  let lateCount = 0;
  let totalLateDays = 0;

  for (const inv of invoices) {
    const due = new Date(inv.due_date);
    const paid = new Date(inv.paid_at);
    const diffDays = (paid.getTime() - due.getTime()) / 86400000;
    if (diffDays > 0) {
      lateCount++;
      totalLateDays += diffDays;
    }
  }

  const lateRatio = lateCount / invoices.length;
  if (lateRatio < 0.5) return null;
  if (lateRatio < 0.7) return null;

  const avgLateDays = Math.round(totalLateDays / lateCount);
  const reminderDays = Math.max(1, avgLateDays);

  return {
    title: "Send invoice reminders before due date",
    description: `${Math.round(lateRatio * 100)}% of invoices are paid late (avg ${avgLateDays} days). A reminder ${reminderDays} days before could help.`,
    trigger_type: "invoice_due_approaching",
    trigger_config: { days_before: reminderDays },
    conditions: [],
    actions: [{ action_type: "send_notification", config: { message: "Invoice due soon", days_before: reminderDays } }],
    confidence: lateRatio,
    explanation: `${lateCount} of ${invoices.length} paid invoices were paid after the due date, averaging ${avgLateDays} days late.`,
    pattern_data: { late_count: lateCount, total_paid: invoices.length, late_ratio: lateRatio, avg_late_days: avgLateDays },
    detected_pattern_type: "invoice_delay",
  };
}
