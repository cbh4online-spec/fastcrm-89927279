import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkStopConditions, hasUnresolvedVariables } from "./guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const now = new Date().toISOString();

    // Fetch due active enrollments
    const { data: due, error } = await supabase
      .from("whatsapp_sequence_enrollments")
      .select("*, whatsapp_sequences(*)")
      .eq("status", "active")
      .lte("next_run_at", now)
      .limit(100);

    if (error) throw error;

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const enr of due ?? []) {
      processed++;
      const seq = (enr as any).whatsapp_sequences;
      if (!seq?.is_enabled) continue;

      // Window check
      const nowD = new Date();
      const hh = nowD.getUTCHours().toString().padStart(2, "0") + ":" + nowD.getUTCMinutes().toString().padStart(2, "0");
      if (seq.send_window_start && seq.send_window_end) {
        if (hh < seq.send_window_start.slice(0, 5) || hh > seq.send_window_end.slice(0, 5)) {
          // postpone 30min
          await supabase.from("whatsapp_sequence_enrollments")
            .update({ next_run_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
            .eq("id", enr.id);
          continue;
        }
      }

      // Claim atómico: só uma execução pode processar este enrollment.
      const { data: claimed } = await supabase
        .from("whatsapp_sequence_enrollments")
        .update({ next_run_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
        .eq("id", enr.id)
        .eq("status", "active")
        .eq("next_run_at", enr.next_run_at)
        .select("id")
        .maybeSingle();
      if (!claimed) continue; // outra execução já apanhou este enrollment

      // Condições de paragem (revalidadas imediatamente antes do envio)
      const guard = await checkStopConditions(supabase, enr as any, {
        stopOnReply: seq.stop_on_reply !== false,
      });
      if (!guard.allowed) {
        if (guard.terminal) {
          await supabase.from("whatsapp_sequence_enrollments")
            .update({
              status: guard.reason === "opted_out" ? "opted_out" : "stopped",
              completed_at: new Date().toISOString(),
              last_error: guard.reason,
            })
            .eq("id", enr.id);
        } else {
          await supabase.from("whatsapp_sequence_enrollments")
            .update({ next_run_at: guard.retryAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString() })
            .eq("id", enr.id);
        }
        await supabase.from("whatsapp_sequence_logs").insert({
          enrollment_id: enr.id,
          workspace_id: enr.workspace_id,
          step_order: enr.current_step_order,
          status: guard.reason === "opted_out" ? "optout" : "skipped",
          error: guard.reason,
        });
        continue;
      }

      // Get next step
      const nextOrder = enr.current_step_order + 1;
      const { data: step } = await supabase
        .from("whatsapp_sequence_steps")
        .select("*")
        .eq("sequence_id", seq.id)
        .eq("step_order", nextOrder)
        .maybeSingle();

      if (!step) {
        await supabase.from("whatsapp_sequence_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enr.id);
        continue;
      }

      // Variable substitution: {{name}}, {{phone}} + variáveis do contexto do enrollment
      const meta = (enr.metadata as any) || {};
      let body = step.message_body || "";
      body = body.replace(/\{\{\s*name\s*\}\}/gi, meta.name || "")
                 .replace(/\{\{\s*phone\s*\}\}/gi, enr.phone || "");
      const engineVars = (meta.variables as Record<string, string>) || {};
      body = body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (raw: string, key: string) => {
        const v = engineVars[key];
        return typeof v === "string" && v.trim() ? v.trim() : raw;
      });

      // Nunca enviar automaticamente com variáveis por resolver.
      if (hasUnresolvedVariables(body)) {
        await supabase.from("whatsapp_sequence_enrollments")
          .update({ status: "stopped", completed_at: new Date().toISOString(), last_error: "unresolved_variables" })
          .eq("id", enr.id);
        await supabase.from("whatsapp_sequence_logs").insert({
          enrollment_id: enr.id,
          workspace_id: enr.workspace_id,
          step_order: nextOrder,
          status: "skipped",
          error: "unresolved_variables",
        });
        continue;
      }

      // Send via whatsapp-pro-send
      try {
        const { data: sendRes, error: sendErr } = await supabase.functions.invoke("whatsapp-pro-send", {
          body: {
            workspace_id: enr.workspace_id,
            phone: enr.phone,
            text: body,
            media_url: step.media_url || undefined,
            cta_url: step.cta_url || undefined,
            cta_label: step.cta_label || undefined,
          },
        });

        if (sendErr) throw sendErr;

        await supabase.from("whatsapp_sequence_logs").insert({
          enrollment_id: enr.id,
          workspace_id: enr.workspace_id,
          step_order: nextOrder,
          status: "sent",
          provider_message_id: (sendRes as any)?.providerMessageId ?? null,
        });

        // Schedule next step
        const { data: nextStep } = await supabase
          .from("whatsapp_sequence_steps")
          .select("delay_minutes")
          .eq("sequence_id", seq.id)
          .eq("step_order", nextOrder + 1)
          .maybeSingle();

        const update: any = { current_step_order: nextOrder };
        if (nextStep) {
          update.next_run_at = new Date(Date.now() + (nextStep.delay_minutes || 0) * 60 * 1000).toISOString();
        } else {
          update.status = "completed";
          update.completed_at = new Date().toISOString();
        }
        await supabase.from("whatsapp_sequence_enrollments").update(update).eq("id", enr.id);
        sent++;
      } catch (e: any) {
        failed++;
        await supabase.from("whatsapp_sequence_logs").insert({
          enrollment_id: enr.id,
          workspace_id: enr.workspace_id,
          step_order: nextOrder,
          status: "failed",
          error: String(e?.message || e),
        });
        await supabase.from("whatsapp_sequence_enrollments")
          .update({
            next_run_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            last_error: String(e?.message || e),
          })
          .eq("id", enr.id);
      }
    }

    return new Response(JSON.stringify({ processed, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ fallback: true, error: String(e?.message || e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
