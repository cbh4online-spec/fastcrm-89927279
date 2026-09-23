import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkStopConditions, hasUnresolvedVariables } from "./guards.ts";
import { signWorkerRequest, workerModeConfigured } from "../_shared/sdr-engine/workerAuth.ts";
import { authorizeDispatchCall } from "./dispatchAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED: boolean = true;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Autenticação interna ANTES de criar o cliente service_role e de qualquer mutação.
  const rawBody = await req.text().catch(() => "");
  const authz = await authorizeDispatchCall((h) => req.headers.get(h), rawBody, {
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    workerEnabled: Deno.env.get("SDR_AUTONOMOUS_SEND_ENABLED"),
    workerSecret: Deno.env.get("SDR_WORKER_SECRET"),
  });
  if (!authz.ok) {
    const f = authz as { status: number; reason: string };
    console.warn("[wa-sequence-dispatch] chamada recusada", { status: f.status, reason: f.reason });
    return new Response(JSON.stringify({ error: f.status === 401 ? "Unauthorized" : "Forbidden", reason: f.reason }), {
      status: f.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fail-closed: sem modo worker configurado não há envios autónomos (antes a
  // chamada falhava sempre por falta de utilizador/messageType).
  const workerEnv = { enabled: Deno.env.get("SDR_AUTONOMOUS_SEND_ENABLED"), secret: Deno.env.get("SDR_WORKER_SECRET") };
  // Fase 1: via autónoma BLOQUEADA explicitamente, mesmo com a flag global SDR.
  // Motivo: ainda não reserva a quota partilhada por conta com o SDR, não respeita
  // aquecimento/consentimento de forma comprovada e não tem opt-in por espaço/sequência.
  // A flag SDR_AUTONOMOUS_SEND_ENABLED não pode, por si só, activar sequências de outros espaços.
  if (PHASE1_WA_SEQUENCE_AUTONOMOUS_BLOCKED) {
    return new Response(JSON.stringify({ disabled: true, reason: "blocked_phase1_shared_quota_not_enforced", processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!workerModeConfigured(workerEnv)) {
    return new Response(JSON.stringify({ disabled: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
        const { data: inst } = await supabase.rpc("ensure_whatsapp_provider_instance", { p_workspace_id: enr.workspace_id });
        const payload = {
          workspaceId: enr.workspace_id,
          phone: enr.phone,
          contactId: enr.contact_id ?? null,
          messageType: "text",
          text: body,
          expectedInstanceId: inst ?? null,
          metadata: { whatsapp_sequence_enrollment_id: enr.id, step_order: nextOrder },
        };
        const raw = JSON.stringify(payload);
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-pro-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            ...(await signWorkerRequest(workerEnv.secret!, enr.workspace_id, raw)),
          },
          body: raw,
        });
        const sendRes = await resp.json().catch(() => null);
        // whatsapp-pro-send responde 200 + {error,fallback} em falhas: não é envio.
        if (!resp.ok || sendRes?.success !== true) {
          throw new Error(sendRes?.error ?? `whatsapp-pro-send_${resp.status}`);
        }

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
