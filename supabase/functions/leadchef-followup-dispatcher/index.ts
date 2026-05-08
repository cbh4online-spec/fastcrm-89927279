// LeadChef sequence dispatcher — processes due steps with full execution logs.
// Pause reasons: lead_replied, stage_changed.
// Action types: next_action | alert | draft_message.
// Every decision is logged to leadchef_sequence_run_logs (idempotent per execution).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

interface RunRow {
  id: string;
  workspace_id: string;
  lead_id: string;
  sequence_id: string;
  current_step_order: number | null;
  status: string;
  last_step_at: string | null;
  enrollment_stage: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const startedAt = Date.now();

  // Helper: write a single log row. Never throws (logging must not break the loop).
  const writeLog = async (
    run: RunRow,
    payload: {
      step_order?: number | null;
      action_type?: string | null;
      status: string;
      reason?: string | null;
      message?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) => {
    try {
      await sb.from("leadchef_sequence_run_logs").insert({
        workspace_id: run.workspace_id,
        run_id: run.id,
        lead_id: run.lead_id,
        sequence_id: run.sequence_id,
        step_order: payload.step_order ?? null,
        action_type: payload.action_type ?? null,
        status: payload.status,
        reason: payload.reason ?? null,
        message: payload.message ?? null,
        metadata: payload.metadata ?? {},
      });
    } catch (e) {
      console.error("[dispatcher] log failed", e);
    }
  };

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body?.limit ?? 100), 500);

    const { data: runs, error: runsErr } = await sb
      .from("leadchef_lead_sequence_runs")
      .select(
        "id, workspace_id, lead_id, sequence_id, current_step_order, status, last_step_at, enrollment_stage",
      )
      .eq("status", "active")
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(limit);
    if (runsErr) throw runsErr;

    const summary = { processed: 0, paused_reply: 0, paused_stage: 0, stepped: 0, completed: 0, errors: 0 };

    for (const run of (runs ?? []) as RunRow[]) {
      summary.processed++;
      try {
        // ---- 1. Stage-change pause -----------------------------------------------------------
        const { data: profile } = await sb
          .from("leadchef_lead_profiles")
          .select("stage")
          .eq("workspace_id", run.workspace_id)
          .eq("lead_id", run.lead_id)
          .maybeSingle();

        const currentStage: string | null = profile?.stage ?? null;
        if (run.enrollment_stage && currentStage && currentStage !== run.enrollment_stage) {
          await sb
            .from("leadchef_lead_sequence_runs")
            .update({
              status: "paused",
              metadata: { paused_reason: "stage_changed", from: run.enrollment_stage, to: currentStage },
            })
            .eq("id", run.id);
          await writeLog(run, {
            status: "paused",
            reason: "stage_changed",
            message: `Sequência pausada: etapa mudou de "${run.enrollment_stage}" para "${currentStage}".`,
            metadata: { from: run.enrollment_stage, to: currentStage },
          });
          summary.paused_stage++;
          continue;
        }

        // ---- 2. Reply pause ------------------------------------------------------------------
        if (run.last_step_at) {
          const { data: replies } = await sb
            .from("crm_activities")
            .select("id")
            .eq("lead_id", run.lead_id)
            .in("activity_type", ["lead_reply", "inbound_message", "incoming_message"])
            .gt("created_at", run.last_step_at)
            .limit(1);
          if (replies && replies.length > 0) {
            await sb
              .from("leadchef_lead_sequence_runs")
              .update({ status: "paused", metadata: { paused_reason: "lead_replied" } })
              .eq("id", run.id);
            await writeLog(run, {
              status: "paused",
              reason: "lead_replied",
              message: "Sequência pausada: o lead respondeu.",
            });
            summary.paused_reply++;
            continue;
          }
        }

        // ---- 3. Fetch next step --------------------------------------------------------------
        const nextOrder = (run.current_step_order ?? 0) + 1;
        const { data: step } = await sb
          .from("leadchef_sequence_steps")
          .select("id, step_order, delay_days, action_type, title, message_template, config")
          .eq("sequence_id", run.sequence_id)
          .eq("step_order", nextOrder)
          .maybeSingle();

        if (!step) {
          await sb
            .from("leadchef_lead_sequence_runs")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", run.id);
          await writeLog(run, {
            status: "completed",
            reason: "no_more_steps",
            message: "Sequência concluída.",
            step_order: run.current_step_order,
          });
          summary.completed++;
          continue;
        }

        // ---- 4. Execute action ---------------------------------------------------------------
        const actionType = step.action_type as string;
        const now = new Date();
        let executedMessage = "";

        if (actionType === "next_action") {
          await sb
            .from("leadchef_lead_profiles")
            .update({
              next_action_type: "follow_up",
              next_action_at: now.toISOString(),
              next_action_note: step.title,
            })
            .eq("workspace_id", run.workspace_id)
            .eq("lead_id", run.lead_id);
          executedMessage = `Próxima ação definida: ${step.title}`;
        } else if (actionType === "alert") {
          await sb.from("crm_activities").insert({
            workspace_id: run.workspace_id,
            lead_id: run.lead_id,
            activity_type: "leadchef_sequence_alert",
            title: step.title,
            description: step.message_template ?? null,
            metadata: { sequence_id: run.sequence_id, step_id: step.id, run_id: run.id },
          });
          executedMessage = `Alerta criado: ${step.title}`;
        } else if (actionType === "draft_message") {
          await sb.from("crm_activities").insert({
            workspace_id: run.workspace_id,
            lead_id: run.lead_id,
            activity_type: "leadchef_sequence_draft",
            title: step.title,
            description: step.message_template ?? null,
            metadata: {
              sequence_id: run.sequence_id,
              step_id: step.id,
              run_id: run.id,
              channel: (step.config as any)?.channel ?? "whatsapp",
            },
          });
          executedMessage = `Mensagem draft preparada: ${step.title}`;
        } else {
          await writeLog(run, {
            status: "skipped",
            reason: "unknown_action_type",
            message: `Tipo de ação desconhecido: ${actionType}`,
            step_order: nextOrder,
            action_type: actionType,
          });
        }

        // ---- 5. Schedule next + log ---------------------------------------------------------
        const { data: peek } = await sb
          .from("leadchef_sequence_steps")
          .select("delay_days")
          .eq("sequence_id", run.sequence_id)
          .eq("step_order", nextOrder + 1)
          .maybeSingle();

        const isLast = !peek;
        const nextRunAt = peek
          ? new Date(now.getTime() + (peek.delay_days ?? 0) * 86400_000).toISOString()
          : now.toISOString();

        await sb
          .from("leadchef_lead_sequence_runs")
          .update({
            current_step_order: nextOrder,
            last_step_at: now.toISOString(),
            next_run_at: nextRunAt,
            status: isLast ? "completed" : "active",
            completed_at: isLast ? now.toISOString() : null,
          })
          .eq("id", run.id);

        await writeLog(run, {
          status: isLast ? "completed" : "stepped",
          step_order: nextOrder,
          action_type: actionType,
          message: executedMessage || `Passo ${nextOrder} executado`,
          metadata: { is_last: isLast, next_run_at: nextRunAt },
        });

        if (isLast) summary.completed++;
        else summary.stepped++;
      } catch (innerErr) {
        summary.errors++;
        console.error("[dispatcher] run error", run.id, innerErr);
        await writeLog(run, {
          status: "error",
          reason: "exception",
          message: (innerErr as Error)?.message ?? "erro desconhecido",
        });
      }
    }

    const result = { ok: true, duration_ms: Date.now() - startedAt, ...summary };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[leadchef-followup-dispatcher] fatal", e);
    return new Response(
      JSON.stringify({ ok: false, fallback: true, error: String((e as Error).message) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
