import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json();
    const { workspace_id, decision_id, action_key, input, correlation_id } = body;
    if (!workspace_id) throw new Error("workspace_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check governance policy if decision_id provided
    const actionsToRun: { action_key: string; params: Record<string, unknown> }[] = [];
    let decisionType: string | null = null;

    if (decision_id) {
      const { data: decision } = await supabase
        .from("kernel_decisions")
        .select("recommended_actions, workspace_id, status, type, policy")
        .eq("id", decision_id)
        .single();

      if (!decision) throw new Error("Decision not found");
      if (decision.status !== "accepted" && decision.status !== "open") {
        throw new Error("Decision already resolved");
      }

      decisionType = decision.type;

      // Check kernel_policies for governance
      const { data: policy } = await supabase
        .from("kernel_policies")
        .select("*")
        .eq("workspace_id", workspace_id)
        .eq("decision_type", decision.type)
        .maybeSingle();

      const mode = policy?.default_mode ?? (decision.policy as any)?.mode ?? "suggest";

      if (mode === "approve" && decision.status !== "accepted") {
        // Needs approval first — don't execute
        return new Response(
          JSON.stringify({ status: "awaiting_approval", decision_id, mode }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
          correlation_id: correlation_id ?? null,
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
          case "NOTIFY":
          case "NOTIFY_OWNER": {
            const p = action.params as any;
            let ownerId: string | null = null;

            if (action.action_key === "NOTIFY_OWNER" && p.entity_type === "opportunity" && p.entity_id) {
              const { data: opp } = await supabase
                .from("opportunities")
                .select("owner_id, title")
                .eq("id", p.entity_id)
                .maybeSingle();
              ownerId = opp?.owner_id ?? null;
            }

            await supabase.from("context_alerts").insert({
              workspace_id,
              type: "kernel",
              title: p.title ?? "Alerta do Kernel",
              message: p.message ?? p.title ?? "",
              severity: p.severity ?? "info",
              target_user_id: ownerId,
            });
            output = { notified: true, owner_id: ownerId };
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
          case "SEND_INBOX_REPLY": {
            const p = action.params as any;
            if (p.conversation_id && p.message) {
              await supabase.from("messages").insert({
                workspace_id,
                conversation_id: p.conversation_id,
                content: p.message,
                direction: "outbound",
                sender_type: "system",
              });
              output = { reply_sent: true };
            } else {
              output = { skipped: true, reason: "Missing conversation_id or message" };
            }
            break;
          }
          case "UPDATE_ASSET": {
            const p = action.params as any;
            // Mark impact_map entries as reviewed for this asset
            await supabase
              .from("impact_map")
              .update({ status: "reviewed" })
              .eq("workspace_id", workspace_id)
              .eq("affected_kind", p.asset_kind)
              .eq("affected_id", p.asset_id)
              .eq("status", "needs_review");
            output = { asset_updated: true };
            break;
          }
          case "PAUSE_CAMPAIGN":
          case "PUBLISH_ASSET":
          case "SEND_EMAIL":
            output = { skipped: true, reason: `Action ${action.action_key} placeholder — integration pending` };
            break;
          default:
            output = { skipped: true, reason: `Unknown action: ${action.action_key}` };
        }

        // Record outcome on success
        if (run && !output.skipped) {
          await supabase.from("kernel_outcomes").insert({
            workspace_id,
            decision_id: decision_id ?? null,
            action_run_id: run.id,
            outcome_type: action.action_key.toLowerCase(),
            outcome_value: output,
            occurred_at: new Date().toISOString(),
          });
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

    // Log observability
    supabase.from("system_function_runs").insert({
      workspace_id,
      function_name: "kernel-run-actions",
      module_id: "kernel",
      status: "success",
      latency_ms: Date.now() - startTime,
      request_id: correlation_id ?? null,
    }).then(() => {});

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
