import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { workspace_id, decision_id, action_key, input } = body;
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If decision_id provided, execute all recommended actions from that decision
    const actionsToRun: { action_key: string; params: Record<string, unknown> }[] = [];

    if (decision_id) {
      const { data: decision } = await supabase
        .from("kernel_decisions")
        .select("recommended_actions, workspace_id, status")
        .eq("id", decision_id)
        .single();

      if (!decision) throw new Error("Decision not found");
      if (decision.status !== "accepted" && decision.status !== "open") {
        throw new Error("Decision already resolved");
      }

      const actions = (decision.recommended_actions as any[]) ?? [];
      actionsToRun.push(...actions);

      // Mark decision as executed
      await supabase
        .from("kernel_decisions")
        .update({ status: "executed", resolved_at: new Date().toISOString() })
        .eq("id", decision_id);
    } else if (action_key) {
      actionsToRun.push({ action_key, params: input ?? {} });
    } else {
      throw new Error("decision_id or action_key required");
    }

    const results: Record<string, unknown>[] = [];

    for (const action of actionsToRun) {
      const { data: run } = await supabase
        .from("kernel_action_runs")
        .insert({
          workspace_id,
          action_key: action.action_key,
          input: action.params,
          status: "running",
          related_decision_id: decision_id ?? null,
        })
        .select("id")
        .single();

      try {
        let output: Record<string, unknown> = {};

        switch (action.action_key) {
          case "CREATE_TASK": {
            const p = action.params as any;
            const { error } = await supabase.from("tasks").insert({
              workspace_id,
              title: p.title ?? "Tarefa do Kernel",
              description: p.description ?? "",
              status: "open",
              priority: p.priority ?? "medium",
              related_type: p.related_type ?? null,
              related_id: p.related_id ?? null,
              assigned_to: p.assigned_to ?? null,
            });
            if (error) throw error;
            output = { created: true };
            break;
          }
          case "NOTIFY": {
            const p = action.params as any;
            await supabase.from("context_alerts").insert({
              workspace_id,
              type: "kernel",
              title: p.title ?? "Alerta do Kernel",
              message: p.message ?? p.title ?? "",
              severity: p.severity ?? "info",
            });
            output = { notified: true };
            break;
          }
          case "RUN_AI_AGENT_JOB": {
            const p = action.params as any;
            await supabase.from("ai_agent_jobs").insert({
              workspace_id,
              agent_type: p.agent_type ?? "general",
              entity_type: p.entity_type ?? "opportunity",
              entity_id: p.entity_id ?? "",
              trigger_type: "kernel",
              status: "pending",
            });
            output = { job_created: true };
            break;
          }
          default:
            output = { skipped: true, reason: `Unknown action: ${action.action_key}` };
        }

        if (run) {
          await supabase
            .from("kernel_action_runs")
            .update({ status: "success", output, finished_at: new Date().toISOString() })
            .eq("id", run.id);
        }
        results.push({ action_key: action.action_key, status: "success", output });
      } catch (actionErr) {
        if (run) {
          await supabase
            .from("kernel_action_runs")
            .update({ status: "failed", error: (actionErr as Error).message, finished_at: new Date().toISOString() })
            .eq("id", run.id);
        }
        results.push({ action_key: action.action_key, status: "failed", error: (actionErr as Error).message });
      }
    }

    return new Response(
      JSON.stringify({ executed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
