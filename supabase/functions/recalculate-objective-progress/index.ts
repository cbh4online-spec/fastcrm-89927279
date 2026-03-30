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
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load objectives
    let query = supabase
      .from("business_objectives")
      .select("*")
      .eq("workspace_id", workspace_id)
      .in("status", ["active", "at_risk", "on_track"]);

    if (objective_id) {
      query = query.eq("id", objective_id);
    }

    const { data: objectives, error: objErr } = await query;
    if (objErr) throw objErr;

    const results: any[] = [];

    for (const obj of objectives || []) {
      // Sum attributed value from completed action links
      const { data: links } = await supabase
        .from("objective_action_links")
        .select("attributed_value, action_execution_id")
        .eq("objective_id", obj.id)
        .eq("workspace_id", workspace_id);

      // Get completed executions
      const actionIds = (links || [])
        .map((l: any) => l.action_execution_id)
        .filter(Boolean);

      let completedValue = 0;
      if (actionIds.length > 0) {
        const { data: completedExecs } = await supabase
          .from("action_executions")
          .select("id")
          .in("id", actionIds)
          .eq("status", "completed");

        const completedIds = new Set((completedExecs || []).map((e: any) => e.id));
        completedValue = (links || [])
          .filter((l: any) => completedIds.has(l.action_execution_id))
          .reduce((sum: number, l: any) => sum + (Number(l.attributed_value) || 0), 0);
      }

      const targetValue = Number(obj.target_value) || 1;
      const progressPercent = Math.min(100, Math.round((completedValue / targetValue) * 100));

      // Calculate trajectory
      const now = new Date();
      const start = obj.period_start ? new Date(obj.period_start) : new Date(obj.created_at);
      const end = obj.period_end ? new Date(obj.period_end) : new Date(start.getTime() + 30 * 86400000);
      const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
      const daysPassed = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
      const expectedProgress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

      let newStatus = obj.status;
      if (completedValue >= targetValue) {
        newStatus = "completed";
      } else if (progressPercent < expectedProgress * 0.7) {
        newStatus = "at_risk";
      } else {
        newStatus = "on_track";
      }

      // Update objective
      const updateData: any = {
        current_value: completedValue,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("business_objectives")
        .update(updateData)
        .eq("id", obj.id);

      // Update metrics
      const { data: metrics } = await supabase
        .from("objective_metrics")
        .select("*")
        .eq("objective_id", obj.id)
        .eq("workspace_id", workspace_id);

      for (const metric of metrics || []) {
        const metricTarget = Number(metric.target_value) || 1;
        const metricProgress = Math.min(100, Math.round((completedValue / metricTarget) * 100));
        await supabase
          .from("objective_metrics")
          .update({
            current_value: completedValue,
            progress_percent: metricProgress,
            last_calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", metric.id);
      }

      // Emit kernel event if status changed
      if (newStatus !== obj.status) {
        const eventType =
          newStatus === "completed" ? "OBJECTIVE.COMPLETED" :
          newStatus === "at_risk" ? "OBJECTIVE.AT_RISK" :
          "OBJECTIVE.ON_TRACK";

        try {
          await supabase.from("kernel_events").insert({
            workspace_id,
            type: eventType,
            entity_kind: "business_objective",
            entity_id: obj.id,
            actor_type: "system",
            source_module: "recalculate-objective-progress",
            payload: {
              previous_status: obj.status,
              new_status: newStatus,
              progress_percent: progressPercent,
              current_value: completedValue,
              target_value: targetValue,
            },
            status: "pending",
            schema_version: 1,
          });
        } catch (e) {
          console.warn("Kernel event emit failed:", e);
        }
      }

      results.push({
        objective_id: obj.id,
        previous_status: obj.status,
        new_status: newStatus,
        progress_percent: progressPercent,
        current_value: completedValue,
        target_value: targetValue,
      });
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("recalculate-objective-progress error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
