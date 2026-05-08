// LeadChef sequence dispatcher — processes due steps and creates next-action / alert / draft messages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body?.limit ?? 100);

    // Fetch due active runs
    const { data: runs, error: runsErr } = await sb
      .from("leadchef_lead_sequence_runs")
      .select("id, workspace_id, lead_id, sequence_id, current_step_order, status, last_step_at")
      .eq("status", "active")
      .lte("next_run_at", new Date().toISOString())
      .order("next_run_at", { ascending: true })
      .limit(limit);

    if (runsErr) throw runsErr;

    const processed: any[] = [];

    for (const run of runs ?? []) {
      // Pause check: did the lead reply / had inbound activity since last_step_at?
      if (run.last_step_at) {
        const { data: replies } = await sb
          .from("leadchef_activities")
          .select("id")
          .eq("lead_id", run.lead_id)
          .eq("activity_type", "lead_reply")
          .gt("created_at", run.last_step_at)
          .limit(1);
        if (replies && replies.length > 0) {
          await sb.from("leadchef_lead_sequence_runs")
            .update({ status: "paused", metadata: { paused_reason: "lead_replied" } })
            .eq("id", run.id);
          processed.push({ id: run.id, action: "paused" });
          continue;
        }
      }

      // Next step
      const nextOrder = (run.current_step_order ?? 0) + 1;
      const { data: step } = await sb
        .from("leadchef_sequence_steps")
        .select("*")
        .eq("sequence_id", run.sequence_id)
        .eq("step_order", nextOrder)
        .maybeSingle();

      if (!step) {
        await sb.from("leadchef_lead_sequence_runs")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", run.id);
        processed.push({ id: run.id, action: "completed" });
        continue;
      }

      // Apply step action — never auto-sends; creates next-action / alert / draft activity
      const actionType = step.action_type as string;
      const now = new Date();

      if (actionType === "next_action") {
        await sb.from("leadchef_leads")
          .update({ next_action_title: step.title, next_action_due_at: now.toISOString() })
          .eq("id", run.lead_id);
      } else if (actionType === "alert") {
        await sb.from("leadchef_activities").insert({
          workspace_id: run.workspace_id,
          lead_id: run.lead_id,
          activity_type: "sequence_alert",
          title: step.title,
          description: step.message_template ?? null,
          metadata: { sequence_id: run.sequence_id, step_id: step.id },
        });
      } else if (actionType === "draft_message") {
        await sb.from("leadchef_activities").insert({
          workspace_id: run.workspace_id,
          lead_id: run.lead_id,
          activity_type: "sequence_draft",
          title: step.title,
          description: step.message_template ?? null,
          metadata: { sequence_id: run.sequence_id, step_id: step.id, channel: step.config?.channel ?? "whatsapp" },
        });
      }

      // Schedule next run
      const { data: peek } = await sb
        .from("leadchef_sequence_steps")
        .select("delay_days")
        .eq("sequence_id", run.sequence_id)
        .eq("step_order", nextOrder + 1)
        .maybeSingle();

      const nextRunAt = peek
        ? new Date(now.getTime() + (peek.delay_days ?? 0) * 86400_000).toISOString()
        : now.toISOString();

      await sb.from("leadchef_lead_sequence_runs")
        .update({
          current_step_order: nextOrder,
          last_step_at: now.toISOString(),
          next_run_at: nextRunAt,
          status: peek ? "active" : "completed",
          completed_at: peek ? null : now.toISOString(),
        })
        .eq("id", run.id);

      processed.push({ id: run.id, action: "stepped", step_order: nextOrder });
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[leadchef-followup-dispatcher]", e);
    return new Response(JSON.stringify({ ok: false, fallback: true, error: String((e as Error).message) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
