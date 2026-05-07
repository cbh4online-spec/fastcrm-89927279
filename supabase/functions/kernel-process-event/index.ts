// FastCRM Kernel — Process Event (v2 with Decision Engine)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evaluateConditions, resolveActions, type Condition, type DecisionAction, type KernelEventLite } from "../_shared/decisionEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { event_id } = await req.json();
    if (!event_id) return json({ ok: false, error: "missing event_id" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ev, error: evErr } = await supabase
      .from("kernel_events")
      .select("*")
      .eq("id", event_id)
      .single();
    if (evErr || !ev) throw evErr ?? new Error("event not found");

    const eventLite: KernelEventLite = ev as KernelEventLite;
    const eventType = ev.event_name ?? ev.type;

    const { data: reg } = await supabase
      .from("kernel_event_registry")
      .select("*")
      .eq("event_type", eventType)
      .maybeSingle();

    // 1) Timeline
    if (!reg || reg.produces_timeline_event !== false) {
      await supabase.from("kernel_entity_timeline").insert({
        workspace_id: ev.workspace_id,
        entity_type: ev.entity_kind,
        entity_id: ev.entity_id,
        event_id: ev.id,
        timeline_type: "event",
        title: eventType,
        description: null,
        occurred_at: ev.occurred_at ?? ev.created_at,
        actor_user_id: ev.actor_user_id,
        source_module: ev.source_module,
      });
    }

    // 2) Context node upsert
    if (!reg || reg.affects_context_graph !== false) {
      await supabase.from("kernel_context_nodes").upsert(
        {
          workspace_id: ev.workspace_id,
          entity_type: ev.entity_kind,
          entity_id: ev.entity_id,
          last_event_at: ev.occurred_at ?? ev.created_at,
        },
        { onConflict: "workspace_id,entity_type,entity_id" },
      );
    }

    // 3) Decision Engine
    const { data: rules } = await supabase
      .from("kernel_decision_rules")
      .select("*")
      .eq("active", true)
      .eq("trigger_event_type", eventType);

    const decisionsCreated: string[] = [];
    const actionRuns: Array<{ rule: string; action: string; ok: boolean; error?: string }> = [];

    for (const rule of rules ?? []) {
      if (rule.workspace_id && rule.workspace_id !== ev.workspace_id) continue;
      // Evaluate conditions
      const passed = evaluateConditions(rule.conditions as Condition[], eventLite);
      if (!passed) continue;

      const resolvedActions = resolveActions(rule.actions as DecisionAction[], eventLite);

      // Create decision record
      const mode = rule.execution_mode ?? (rule.auto_execute ? "auto" : "suggest");
      const { data: decision, error: dErr } = await supabase.from("kernel_decisions").insert({
        workspace_id: ev.workspace_id,
        event_id: ev.id,
        rule_id: rule.id,
        type: rule.decision_type,
        decision_type: rule.decision_type,
        title: rule.name,
        description: rule.description,
        priority: (rule.priority ?? 100) / 100,
        summary: rule.name,
        rationale: `Regra "${rule.name}" disparada por ${eventType}`,
        recommended_action: { actions: resolvedActions },
        recommended_actions: resolvedActions,
        decision_source: "decision_engine",
        status: mode === "auto" ? "executing" : "open",
        confidence: 0.8,
        requires_human_approval: mode === "approval",
        policy: { mode },
      }).select("id").single();
      if (dErr || !decision) { console.error("[decision insert]", dErr); continue; }
      decisionsCreated.push(decision.id);

      // Update rule telemetry
      await supabase.from("kernel_decision_rules").update({
        last_executed_at: new Date().toISOString(),
        execution_count: (rule.execution_count ?? 0) + 1,
      }).eq("id", rule.id);

      // Auto execute if mode = auto
      if (mode === "auto") {
        let allOk = true;
        for (const action of resolvedActions) {
          const result = await invokeAction(supabase, {
            workspace_id: ev.workspace_id,
            action_key: action.type,
            config: action.config,
            related_event_id: ev.id,
            related_decision_id: decision.id,
          });
          actionRuns.push({ rule: rule.name, action: action.type, ok: result.ok, error: result.error });
          if (!result.ok) allOk = false;
        }
        await supabase.from("kernel_decisions").update({
          status: allOk ? "executed" : "failed",
          executed_at: new Date().toISOString(),
          executed_action: { actions: resolvedActions, results: actionRuns.filter(r => r.rule === rule.name) },
        }).eq("id", decision.id);
        await supabase.from("kernel_decision_rules").update({
          [allOk ? "success_count" : "failure_count"]: (allOk ? rule.success_count : rule.failure_count) + 1,
        }).eq("id", rule.id);
      }
    }

    // 4) Mark processed
    await supabase
      .from("kernel_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", event_id);

    return json({ ok: true, event_id, decisionsCreated: decisionsCreated.length, actionRuns });
  } catch (err) {
    console.error("[kernel-process-event]", err);
    return json({ ok: false, fallback: true, error: (err as Error).message }, 200);
  }
});

async function invokeAction(
  supabase: ReturnType<typeof createClient>,
  payload: { workspace_id: string; action_key: string; config: Record<string, unknown>; related_event_id?: string; related_decision_id?: string },
): Promise<{ ok: boolean; error?: string; output?: unknown }> {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kernel-execute-action`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    return { ok: !!data.ok, error: data.error, output: data.output };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
