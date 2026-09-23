/**
 * sdr-sequence-executor — Fase 1 (fail-closed).
 *
 * Só executa envios quando TODAS as condições se verificam:
 *   - chamada interna com service role (Trigger.dev / cron);
 *   - secret SDR_AUTONOMOUS_SEND_ENABLED === "true" e SDR_WORKER_SECRET definido;
 *   - migração 20260923180000_sdr_prospecting_phase1 aplicada;
 *   - campanha activa com autonomous_send_enabled = true.
 * Por defeito devolve { disabled: true } sem tocar em nenhuma linha.
 * Lógica de negócio em _shared/sdr-engine/executor.ts.
 */
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "@supabase/supabase-js/cors";
import { runEnrollmentStep, type StepReport } from "../_shared/sdr-engine/executor.ts";
import { createSupabasePorts, detectPhase1Schema } from "../_shared/sdr-engine/supabasePorts.ts";
import { workerModeConfigured } from "../_shared/sdr-engine/workerAuth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH_LIMIT = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Apenas chamadas internas (service role). Utilizadores não disparam envios autónomos.
  const auth = req.headers.get("Authorization") ?? "";
  if (!serviceRoleKey || auth !== `Bearer ${serviceRoleKey}`) return json({ error: "Unauthorized" }, 401);

  const workerEnv = { enabled: Deno.env.get("SDR_AUTONOMOUS_SEND_ENABLED"), secret: Deno.env.get("SDR_WORKER_SECRET") };
  const globalSendEnabled = workerModeConfigured(workerEnv);
  if (!globalSendEnabled) return json({ success: true, disabled: true, processed: 0 });

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const schemaReady = await detectPhase1Schema(admin);
    if (!schemaReady) return json({ success: true, disabled: true, reason: "schema_not_ready", processed: 0 });

    const ports = createSupabasePorts(admin, {
      supabaseUrl, serviceRoleKey, workerSecret: workerEnv.secret, schemaReady,
      // Relida em cada revalidação: remover a flag pára envios a meio de um lote.
      globalSendEnabled: () => workerModeConfigured({ enabled: Deno.env.get("SDR_AUTONOMOUS_SEND_ENABLED"), secret: Deno.env.get("SDR_WORKER_SECRET") }),
      publicAppUrl: Deno.env.get("SDR_PUBLIC_APP_URL"),
    });

    const body = await req.json().catch(() => ({}));
    if (body?.mode === "single_step") {
      if (!UUID_RE.test(body.enrollment_id ?? "") || !UUID_RE.test(body.workspace_id ?? "")) {
        return json({ error: "enrollment_id e workspace_id válidos são obrigatórios" }, 400);
      }
      const report = await runEnrollmentStep(ports, body.workspace_id, body.enrollment_id);
      return json({ success: true, data: report });
    }

    // Batch: só campanhas explicitamente activadas para envio autónomo.
    const { data: campaigns, error: cErr } = await admin.from("sdr_campaigns")
      .select("id, workspace_id").eq("status", "active").eq("autonomous_send_enabled", true);
    if (cErr) throw cErr;
    if (!campaigns?.length) return json({ success: true, processed: 0 });

    const reports: StepReport[] = [];
    for (const c of campaigns) {
      const { data: due, error } = await admin.from("sdr_enrollments").select("id")
        .eq("campaign_id", c.id).eq("workspace_id", c.workspace_id).eq("status", "sequenced")
        .not("next_send_at", "is", null).lte("next_send_at", new Date().toISOString())
        .order("next_send_at").limit(BATCH_LIMIT);
      if (error) throw error;
      for (const e of due ?? []) {
        try {
          reports.push(await runEnrollmentStep(ports, c.workspace_id, e.id));
        } catch (err) {
          console.error("[sdr-sequence-executor] step error", { enrollment: e.id, err: err instanceof Error ? err.message : String(err) });
          reports.push({ outcome: "busy", reason: "exception", enrollmentId: e.id });
        }
      }
    }
    const summary: Record<string, number> = {};
    for (const r of reports) summary[r.outcome] = (summary[r.outcome] ?? 0) + 1;
    return json({ success: true, processed: reports.length, summary });
  } catch (err) {
    console.error("[sdr-sequence-executor] Error:", err instanceof Error ? err.message : err);
    return json({ success: false, fallback: true, error: "internal_error" }, 200);
  }
});
