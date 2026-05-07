// FastCRM Kernel — Execute a single decision action
// Suporta: create_task, assign_owner, send_notification, emit_kernel_event, trigger_workflow
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionInput {
  workspace_id: string;
  action_key: string;
  config: Record<string, unknown>;
  related_event_id?: string;
  related_decision_id?: string;
  correlation_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const input = await req.json() as ActionInput;
    if (!input.workspace_id || !input.action_key) {
      return json({ ok: false, error: "missing workspace_id or action_key" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert run record
    const { data: run, error: runErr } = await supabase
      .from("kernel_action_runs")
      .insert({
        workspace_id: input.workspace_id,
        action_key: input.action_key,
        input: input.config ?? {},
        status: "running",
        related_event_id: input.related_event_id ?? null,
        related_decision_id: input.related_decision_id ?? null,
        correlation_id: input.correlation_id ?? null,
      })
      .select()
      .single();
    if (runErr) throw runErr;

    let output: Record<string, unknown> = {};
    try {
      output = await execute(supabase, input);
      await supabase.from("kernel_action_runs")
        .update({ status: "succeeded", output, finished_at: new Date().toISOString() })
        .eq("id", run.id);
      return json({ ok: true, run_id: run.id, output });
    } catch (err) {
      const msg = (err as Error).message;
      await supabase.from("kernel_action_runs")
        .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
        .eq("id", run.id);
      return json({ ok: false, run_id: run.id, error: msg, fallback: true }, 200);
    }
  } catch (err) {
    console.error("[kernel-execute-action]", err);
    return json({ ok: false, fallback: true, error: (err as Error).message }, 200);
  }
});

async function execute(
  supabase: ReturnType<typeof createClient>,
  input: ActionInput,
): Promise<Record<string, unknown>> {
  const cfg = input.config ?? {};
  switch (input.action_key) {
    case "create_task": {
      const { data, error } = await supabase.from("tasks").insert({
        workspace_id: input.workspace_id,
        related_type: String(cfg.related_type ?? "kernel_decision"),
        related_id: cfg.related_id ?? input.related_decision_id ?? input.related_event_id,
        title: String(cfg.title ?? "Tarefa do Decision Engine"),
        description: cfg.description ? String(cfg.description) : null,
        status: String(cfg.status ?? "open"),
        priority: cfg.priority ? String(cfg.priority) : "medium",
        assigned_to: cfg.assigned_to ?? null,
        due_at: cfg.due_at ?? null,
      }).select("id").single();
      if (error) throw error;
      return { task_id: data.id };
    }
    case "assign_owner": {
      const entityTable = String(cfg.entity_table ?? "");
      const entityId = cfg.entity_id;
      const ownerId = cfg.owner_id;
      if (!entityTable || !entityId || !ownerId) throw new Error("assign_owner requires entity_table, entity_id, owner_id");
      const ownerCol = String(cfg.owner_column ?? "owner_id");
      // deno-lint-ignore no-explicit-any
      const { error } = await (supabase as any).from(entityTable).update({ [ownerCol]: ownerId }).eq("id", entityId);
      if (error) throw error;
      return { entity_table: entityTable, entity_id: entityId, owner_id: ownerId };
    }
    case "send_notification": {
      const { data, error } = await supabase.from("admin_notifications").insert({
        workspace_id: input.workspace_id,
        user_id: cfg.user_id ?? null,
        type: String(cfg.type ?? "decision_engine"),
        title: String(cfg.title ?? "Notificação"),
        message: String(cfg.message ?? ""),
        metadata: cfg.metadata ?? {},
      }).select("id").single();
      if (error) throw error;
      return { notification_id: data.id };
    }
    case "emit_kernel_event": {
      const { data, error } = await supabase.from("kernel_events").insert({
        workspace_id: input.workspace_id,
        type: String(cfg.event_type ?? "decision.action"),
        event_name: String(cfg.event_type ?? "decision.action"),
        entity_kind: cfg.entity_kind ? String(cfg.entity_kind) : null,
        entity_id: cfg.entity_id ?? null,
        payload: cfg.payload ?? {},
        source_module: "decision_engine",
        status: "pending",
      }).select("id").single();
      if (error) throw error;
      return { event_id: data.id };
    }
    case "trigger_workflow": {
      // Bridge para Smart Workflows existentes
      const code = cfg.workflow_code;
      if (!code) throw new Error("trigger_workflow requires workflow_code");
      const { data: def, error: defErr } = await supabase
        .from("workflow_definitions")
        .select("id, version")
        .eq("workspace_id", input.workspace_id)
        .eq("code", code)
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (defErr) throw defErr;
      if (!def) throw new Error(`workflow not found: ${code}`);
      const { data: exec, error: execErr } = await supabase.from("workflow_executions").insert({
        workspace_id: input.workspace_id,
        definition_id: def.id,
        workflow_code: code,
        workflow_version: def.version,
        trigger_type: "decision_engine",
        trigger_source: input.related_decision_id ?? input.related_event_id ?? null,
        entity_type: cfg.entity_type ?? null,
        entity_id: cfg.entity_id ?? null,
        status: "queued",
        input: cfg.input ?? {},
      }).select("id").single();
      if (execErr) throw execErr;
      return { workflow_execution_id: exec.id, workflow_code: code };
    }
    default:
      throw new Error(`Unsupported action: ${input.action_key}`);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
