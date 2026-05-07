// voicehub-smoke-test — Sprint 1
// Executa diagnóstico end-to-end do VoiceHub para um workspace:
// 1. Verifica configuração de provider instances
// 2. Para cada instance ativa: chama testConnection() do adapter
// 3. Verifica integridade das tabelas voice_provider_logs (últimas 24h)
// 4. Verifica rates configurados
// Persiste o resultado em sprint_smoke_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getAdapter, buildRuntimeConfig } from "../_shared/voice/adapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

interface Step { name: string; status: "pass" | "fail" | "warn"; detail?: unknown; duration_ms?: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const t0 = Date.now();
  const steps: Step[] = [];

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claimsData } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claimsData?.claims?.sub;
    if (!userId) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Super admin only
    const { data: superCheck } = await admin.rpc("is_super_admin", { _user_id: userId });
    if (!superCheck) return j({ error: "Forbidden" }, 403);

    const { workspace_id } = await req.json().catch(() => ({}));
    if (!workspace_id) return j({ error: "workspace_id obrigatório" }, 400);

    // Step 1: instances
    const s1 = Date.now();
    const { data: instances, error: e1 } = await admin
      .from("voice_provider_instances")
      .select("id, provider_name, active, last_test_status, last_tested_at")
      .eq("workspace_id", workspace_id);
    if (e1) {
      steps.push({ name: "list_instances", status: "fail", detail: e1.message, duration_ms: Date.now() - s1 });
    } else if (!instances || instances.length === 0) {
      steps.push({ name: "list_instances", status: "warn", detail: "no_instances_configured", duration_ms: Date.now() - s1 });
    } else {
      steps.push({ name: "list_instances", status: "pass", detail: { count: instances.length }, duration_ms: Date.now() - s1 });
    }

    // Step 2: testConnection per active instance
    const activeInstances = (instances ?? []).filter((i: any) => i.active);
    for (const inst of activeInstances) {
      const sx = Date.now();
      try {
        const { data: full } = await admin
          .from("voice_provider_instances").select("*")
          .eq("id", inst.id).maybeSingle();
        const adapter = getAdapter(inst.provider_name);
        const cfg = buildRuntimeConfig(full);
        const r = await adapter.testConnection(cfg);
        steps.push({
          name: `test_connection:${inst.provider_name}`,
          status: r.ok ? "pass" : "fail",
          detail: { message: r.message, latency_ms: r.latencyMs },
          duration_ms: Date.now() - sx,
        });
      } catch (e) {
        steps.push({
          name: `test_connection:${inst.provider_name}`,
          status: "fail",
          detail: { error: e instanceof Error ? e.message : String(e) },
          duration_ms: Date.now() - sx,
        });
      }
    }

    // Step 3: logs health (24h)
    const s3 = Date.now();
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: logs, error: e3 } = await admin
      .from("voice_provider_logs")
      .select("id, success, event_type")
      .eq("workspace_id", workspace_id)
      .gte("created_at", since)
      .limit(500);
    if (e3) {
      steps.push({ name: "logs_24h", status: "fail", detail: e3.message, duration_ms: Date.now() - s3 });
    } else {
      const total = logs?.length ?? 0;
      const errors = (logs ?? []).filter((l: any) => l.success === false).length;
      const ratio = total > 0 ? errors / total : 0;
      steps.push({
        name: "logs_24h",
        status: total === 0 ? "warn" : ratio > 0.3 ? "fail" : ratio > 0.1 ? "warn" : "pass",
        detail: { total, errors, error_ratio: Number(ratio.toFixed(3)) },
        duration_ms: Date.now() - s3,
      });
    }

    // Step 4: rates configured
    const s4 = Date.now();
    const { count: rateCount } = await admin
      .from("voice_provider_rates")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);
    steps.push({
      name: "rates_configured",
      status: (rateCount ?? 0) > 0 ? "pass" : "warn",
      detail: { count: rateCount ?? 0 },
      duration_ms: Date.now() - s4,
    });

    const fails = steps.filter((s) => s.status === "fail").length;
    const warns = steps.filter((s) => s.status === "warn").length;
    const status = fails > 0 ? "fail" : warns > 0 ? "warn" : "pass";
    const summary = `VoiceHub smoke: ${steps.length} passos, ${fails} fail, ${warns} warn`;

    await admin.from("sprint_smoke_runs").insert({
      suite: "voicehub", workspace_id, triggered_by: userId,
      status, steps: steps as never, summary, duration_ms: Date.now() - t0,
    });

    return j({ ok: true, status, summary, steps, duration_ms: Date.now() - t0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return j({ ok: false, error: msg, steps }, 200); // 200 + fallback (memory rule)
  }
});
