/**
 * Student Journey Daily Automation Scheduler
 * Runs daily to check for inactive base, cooling periods, and eligibility triggers
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SJProfile {
  id: string;
  full_name: string;
  email?: string;
  last_course_completed_at?: string;
  activation_potential?: string;
  owner_user_id?: string;
  student_score?: number;
  total_courses_completed?: number;
  lifecycle_stage?: string;
}

interface AutomationResult {
  workspaceId: string;
  automationsTriggered: number;
  profilesProcessed: number;
  tasksCreated: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: AutomationResult[] = [];

    // Get all workspaces with active SJ automations
    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("id");

    if (wsError) throw wsError;

    for (const workspace of workspaces || []) {
      const result = await processWorkspaceAutomations(supabase, workspace.id);
      results.push(result);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in daily automation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function processWorkspaceAutomations(
  supabase: any,
  workspaceId: string
): Promise<AutomationResult> {
  const result: AutomationResult = {
    workspaceId,
    automationsTriggered: 0,
    profilesProcessed: 0,
    tasksCreated: 0,
    errors: [],
  };

  try {
    // 1. CHECK INACTIVE BASE (6, 9, 12 months)
    await checkInactiveBase(supabase, workspaceId, result);

    // 2. CHECK COOLING PERIOD ENDED (30 days after completion)
    await checkCoolingPeriodEnded(supabase, workspaceId, result);

    // 3. CHECK ELIGIBILITY FOR PROGRESSION (3+ courses = strategic alumni)
    await checkStrategicAlumni(supabase, workspaceId, result);

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : "Unknown error");
  }

  return result;
}

/**
 * Check for profiles inactive for 6, 9, or 12 months
 */
// deno-lint-ignore no-explicit-any
async function checkInactiveBase(
  supabase: any,
  workspaceId: string,
  result: AutomationResult
): Promise<void> {
  const now = new Date();
  
  // 6 months threshold
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // 9 months threshold
  const nineMonthsAgo = new Date(now);
  nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);
  
  // 12 months threshold
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Get profiles completed 6+ months ago that are still completed_active
  const { data: profiles6m, error: err6m } = await supabase
    .from("sj_profiles")
    .select("id, full_name, email, last_course_completed_at, activation_potential, owner_user_id")
    .eq("workspace_id", workspaceId)
    .eq("lifecycle_stage", "completed_active")
    .lt("last_course_completed_at", sixMonthsAgo.toISOString())
    .gte("last_course_completed_at", nineMonthsAgo.toISOString())
    .neq("activation_potential", "medium")
    .neq("activation_potential", "high");

  if (err6m) {
    result.errors.push(`6m check: ${err6m.message}`);
  } else if (profiles6m) {
    for (const profile of profiles6m as SJProfile[]) {
      await processInactiveProfile(supabase, workspaceId, profile, "medium", 6, result);
    }
  }

  // Get profiles completed 9+ months ago
  const { data: profiles9m, error: err9m } = await supabase
    .from("sj_profiles")
    .select("id, full_name, email, last_course_completed_at, activation_potential, owner_user_id")
    .eq("workspace_id", workspaceId)
    .eq("lifecycle_stage", "completed_active")
    .lt("last_course_completed_at", nineMonthsAgo.toISOString())
    .gte("last_course_completed_at", twelveMonthsAgo.toISOString())
    .neq("activation_potential", "high");

  if (err9m) {
    result.errors.push(`9m check: ${err9m.message}`);
  } else if (profiles9m) {
    for (const profile of profiles9m as SJProfile[]) {
      await processInactiveProfile(supabase, workspaceId, profile, "high", 9, result);
    }
  }

  // Get profiles completed 12+ months ago - mark as inactive
  const { data: profiles12m, error: err12m } = await supabase
    .from("sj_profiles")
    .select("id, full_name, email, last_course_completed_at, owner_user_id")
    .eq("workspace_id", workspaceId)
    .neq("lifecycle_stage", "inactive")
    .neq("lifecycle_stage", "churned")
    .not("last_course_completed_at", "is", null)
    .lt("last_course_completed_at", twelveMonthsAgo.toISOString());

  if (err12m) {
    result.errors.push(`12m check: ${err12m.message}`);
  } else if (profiles12m) {
    for (const profile of profiles12m as SJProfile[]) {
      await markAsInactive(supabase, workspaceId, profile, result);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function processInactiveProfile(
  supabase: any,
  workspaceId: string,
  profile: SJProfile,
  newPotential: string,
  monthsInactive: number,
  result: AutomationResult
): Promise<void> {
  // Update activation potential
  await supabase
    .from("sj_profiles")
    .update({ activation_potential: newPotential })
    .eq("id", profile.id);

  // Create reactivation task
  const priority = monthsInactive >= 9 ? "high" : "medium";
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (monthsInactive >= 9 ? 3 : 7));

  await supabase.from("sj_tasks").insert({
    workspace_id: workspaceId,
    profile_id: profile.id,
    title: monthsInactive >= 9 
      ? `PRIORIDADE: Reativar alumni - ${profile.full_name}`
      : `Reativar alumni - ${profile.full_name}`,
    description: `Alumni sem atividade há ${monthsInactive} meses. Verificar interesse em novas formações.`,
    priority,
    due_date: dueDate.toISOString(),
    status: "pending",
  });

  // Create touchpoint
  await supabase.from("sj_touchpoints").insert({
    workspace_id: workspaceId,
    profile_id: profile.id,
    touchpoint_type: "automation",
    message_preview: `Sistema: Alerta de inatividade (${monthsInactive} meses) - Potencial: ${newPotential}`,
    created_by: "system",
  });

  result.profilesProcessed++;
  result.tasksCreated++;
  result.automationsTriggered++;
}

// deno-lint-ignore no-explicit-any
async function markAsInactive(
  supabase: any,
  workspaceId: string,
  profile: SJProfile,
  result: AutomationResult
): Promise<void> {
  await supabase
    .from("sj_profiles")
    .update({ lifecycle_stage: "inactive" })
    .eq("id", profile.id);

  await supabase.from("sj_touchpoints").insert({
    workspace_id: workspaceId,
    profile_id: profile.id,
    touchpoint_type: "automation",
    message_preview: "Sistema: Marcado como inativo após 12 meses sem atividade",
    created_by: "system",
  });

  await supabase.from("sj_tasks").insert({
    workspace_id: workspaceId,
    profile_id: profile.id,
    title: `Último contacto antes de arquivar - ${profile.full_name}`,
    description: "Alumni inativo há 12+ meses. Tentar contacto final ou arquivar como churned.",
    priority: "low",
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  });

  result.profilesProcessed++;
  result.automationsTriggered++;
}

/**
 * Check for profiles whose cooling period (30 days) has ended
 */
// deno-lint-ignore no-explicit-any
async function checkCoolingPeriodEnded(
  supabase: any,
  workspaceId: string,
  result: AutomationResult
): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

  // Get profiles that completed exactly 30 days ago (cooling period just ended)
  const { data: profiles, error } = await supabase
    .from("sj_profiles")
    .select("id, full_name, email, student_score, total_courses_completed, owner_user_id")
    .eq("workspace_id", workspaceId)
    .eq("lifecycle_stage", "completed_active")
    .lt("last_course_completed_at", thirtyDaysAgo.toISOString())
    .gte("last_course_completed_at", thirtyOneDaysAgo.toISOString());

  if (error) {
    result.errors.push(`Cooling period check: ${error.message}`);
    return;
  }

  for (const profile of (profiles || []) as SJProfile[]) {
    const score = profile.student_score || 0;
    
    if (score >= 60) {
      // Eligible for progression
      await supabase
        .from("sj_profiles")
        .update({ lifecycle_stage: "eligible_progression" })
        .eq("id", profile.id);

      await supabase.from("sj_tasks").insert({
        workspace_id: workspaceId,
        profile_id: profile.id,
        title: `Propor nova formação - ${profile.full_name}`,
        description: `Aluno concluiu período de reflexão. Score: ${score}. Sugerir formação complementar.`,
        priority: "high",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      });

      await supabase.from("sj_ai_suggestions").insert({
        workspace_id: workspaceId,
        profile_id: profile.id,
        suggestion_type: "progression",
        message: `${profile.full_name} está elegível para progressão. Score: ${score}. Recomendar formações complementares.`,
        priority: "high",
        status: "pending",
      });

      await supabase.from("sj_touchpoints").insert({
        workspace_id: workspaceId,
        profile_id: profile.id,
        touchpoint_type: "automation",
        message_preview: "Sistema: Período de reflexão concluído - Elegível para progressão",
        outcome: "progression_interest",
        created_by: "system",
      });

      result.profilesProcessed++;
      result.tasksCreated++;
      result.automationsTriggered++;
    }
  }
}

/**
 * Check for profiles with multiple completions → strategic alumni
 */
// deno-lint-ignore no-explicit-any
async function checkStrategicAlumni(
  supabase: any,
  workspaceId: string,
  result: AutomationResult
): Promise<void> {
  // Get profiles with 3+ courses completed that are not yet alumni
  const { data: profiles, error } = await supabase
    .from("sj_profiles")
    .select("id, full_name, total_courses_completed, owner_user_id")
    .eq("workspace_id", workspaceId)
    .neq("lifecycle_stage", "alumni")
    .gte("total_courses_completed", 3);

  if (error) {
    result.errors.push(`Alumni check: ${error.message}`);
    return;
  }

  for (const profile of (profiles || []) as SJProfile[]) {
    await supabase
      .from("sj_profiles")
      .update({ lifecycle_stage: "alumni" })
      .eq("id", profile.id);

    await supabase.from("sj_touchpoints").insert({
      workspace_id: workspaceId,
      profile_id: profile.id,
      touchpoint_type: "milestone",
      outcome: "positive",
      message_preview: `⭐ Promovido a Alumni Estratégico - ${profile.total_courses_completed} formações concluídas!`,
      created_by: "system",
    });

    await supabase.from("sj_ai_suggestions").insert({
      workspace_id: workspaceId,
      profile_id: profile.id,
      suggestion_type: "vip_treatment",
      message: `${profile.full_name} foi promovido a Alumni Estratégico. Considerar tratamento VIP.`,
      priority: "high",
      status: "pending",
    });

    result.profilesProcessed++;
    result.automationsTriggered++;
  }
}
