import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, objective_id } = await req.json();
    if (!workspace_id || !objective_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id and objective_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load objective
    const { data: objective } = await supabase
      .from("business_objectives")
      .select("*")
      .eq("id", objective_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!objective) {
      return new Response(
        JSON.stringify({ error: "Objective not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load active plan
    const { data: plan } = await supabase
      .from("objective_plans")
      .select("*")
      .eq("objective_id", objective_id)
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan?.plan_json) {
      return new Response(
        JSON.stringify({ error: "No active plan found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load settings
    const { data: settings } = await supabase
      .from("objective_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const maxDaily = settings?.max_daily_actions_per_objective || 10;

    const planData = plan.plan_json as any;
    const initiatives = planData.initiatives || [];
    let actionsCreated = 0;
    const links: any[] = [];

    for (const initiative of initiatives) {
      for (const actionGroup of initiative.action_groups || []) {
        const correlationId = `obj_${objective_id}_${actionGroup.action_type}_${actionGroup.day_offset || 0}_${actionsCreated}`;

        // Check idempotency
        const { data: existing } = await supabase
          .from("action_executions")
          .select("id")
          .eq("correlation_id", correlationId)
          .eq("workspace_id", workspace_id)
          .maybeSingle();

        if (existing) continue;

        // Create action execution
        const { data: execution, error: execErr } = await supabase
          .from("action_executions")
          .insert({
            workspace_id,
            source_type: "objective",
            source_id: objective_id,
            action_type: actionGroup.action_type,
            title: actionGroup.title,
            description: actionGroup.description || null,
            payload_json: {
              entity_type: actionGroup.entity_type || null,
              estimated_impact_value: actionGroup.estimated_impact_value || 0,
              day_offset: actionGroup.day_offset || 0,
              initiative_title: initiative.title,
            },
            entity_type: actionGroup.entity_type || null,
            execution_mode: objective.auto_execute_enabled ? "auto" : "manual",
            status: "pending",
            correlation_id: correlationId,
          })
          .select("id")
          .single();

        if (execErr) {
          console.error("Action creation error:", execErr);
          continue;
        }

        // Create link
        const { error: linkErr } = await supabase
          .from("objective_action_links")
          .insert({
            workspace_id,
            objective_id,
            action_execution_id: execution.id,
            attributed_value: actionGroup.estimated_impact_value || 0,
          });

        if (!linkErr) {
          links.push({ action_id: execution.id, type: actionGroup.action_type });
          actionsCreated++;
        }
      }
    }

    // Update objective status to active if draft
    if (objective.status === "draft") {
      await supabase
        .from("business_objectives")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", objective_id);
    }

    // Emit kernel event
    try {
      await supabase.from("kernel_events").insert({
        workspace_id,
        type: "OBJECTIVE.PLAN_EXECUTED",
        entity_kind: "business_objective",
        entity_id: objective_id,
        actor_type: "system",
        source_module: "process-objective-plan",
        payload: { actions_created: actionsCreated, plan_id: plan.id },
        status: "pending",
        schema_version: 1,
      });
    } catch (e) {
      console.warn("Kernel event emit failed:", e);
    }

    return new Response(
      JSON.stringify({ actions_created: actionsCreated, links }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-objective-plan error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
