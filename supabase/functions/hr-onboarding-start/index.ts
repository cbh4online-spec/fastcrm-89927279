import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { employee_id, template_id, buddy_id, start_date, workspace_id } = await req.json();
    if (!employee_id || !template_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "employee_id, template_id, and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for creating records
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const effectiveStartDate = start_date || new Date().toISOString().split("T")[0];

    // Create onboarding instance
    const { data: onboarding, error: onbError } = await supabaseAdmin
      .from("hr_onboardings")
      .insert({
        workspace_id,
        employee_id,
        template_id,
        buddy_id: buddy_id || null,
        status: "pending",
        start_date: effectiveStartDate,
        expected_end_date: addDays(effectiveStartDate, 90),
        created_by: user.id,
      })
      .select()
      .single();

    if (onbError) throw onbError;

    // Get task templates
    const { data: taskTemplates, error: ttError } = await supabaseAdmin
      .from("hr_onboarding_task_templates")
      .select("*")
      .eq("template_id", template_id)
      .order("sort_order", { ascending: true });

    if (ttError) throw ttError;

    // Create concrete tasks from templates
    if (taskTemplates && taskTemplates.length > 0) {
      const tasks = taskTemplates.map((tt) => ({
        onboarding_id: onboarding.id,
        workspace_id,
        title: tt.title,
        description: tt.description,
        category: tt.category,
        due_date: addDays(effectiveStartDate, tt.due_days),
        is_required: tt.is_required,
        sort_order: tt.sort_order,
      }));

      const { error: tasksError } = await supabaseAdmin
        .from("hr_onboarding_tasks")
        .insert(tasks);
      if (tasksError) throw tasksError;
    }

    // Create feedback checkpoints (30, 60, 90 days)
    const feedbackCheckpoints = [
      { feedback_type: "30_days" as const, days: 30 },
      { feedback_type: "60_days" as const, days: 60 },
      { feedback_type: "90_days" as const, days: 90 },
    ];

    const feedbacks = feedbackCheckpoints.map((cp) => ({
      onboarding_id: onboarding.id,
      workspace_id,
      feedback_type: cp.feedback_type,
      due_date: addDays(effectiveStartDate, cp.days),
    }));

    const { error: fbError } = await supabaseAdmin
      .from("hr_onboarding_feedback")
      .insert(feedbacks);
    if (fbError) throw fbError;

    return new Response(JSON.stringify({ onboarding, tasks_created: taskTemplates?.length || 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hr-onboarding-start error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
