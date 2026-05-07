// voice-test-provider — Fase 1P. Testa ligação ao fornecedor sem expor secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter, buildRuntimeConfig } from "../_shared/voice/adapters.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return j({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const { workspace_id, provider_instance_id } = await req.json().catch(() => ({}));
    if (!workspace_id || !provider_instance_id) return j({ error: "workspace_id e provider_instance_id obrigatórios" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: m } = await admin.from("workspace_members").select("user_id")
      .eq("workspace_id", workspace_id).eq("user_id", userId).maybeSingle();
    if (!m) return j({ error: "Forbidden" }, 403);

    const { data: instance } = await admin.from("voice_provider_instances").select("*")
      .eq("id", provider_instance_id).eq("workspace_id", workspace_id).maybeSingle();
    if (!instance) return j({ error: "instance not found" }, 404);

    const adapter = getAdapter(instance.provider_name);
    const config = buildRuntimeConfig(instance);
    const start = Date.now();
    const result = await adapter.testConnection(config);
    const durationMs = Date.now() - start;

    await admin.from("voice_provider_instances").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: result.ok ? "ok" : "error",
      last_error: result.ok ? null : result.message,
    }).eq("id", instance.id);

    await admin.from("voice_provider_logs").insert({
      workspace_id, provider_instance_id: instance.id, provider_name: instance.provider_name,
      event_type: "test_connection", direction: "test",
      success: result.ok, processed: true, duration_ms: durationMs,
      error: result.ok ? null : result.message,
      normalized_payload: { latency_ms: result.latencyMs ?? null },
    });

    return j({
      ok: result.ok,
      message: result.message,
      latency_ms: result.latencyMs ?? durationMs,
      capabilities: result.detectedCapabilities ?? null,
    });
  } catch (e: any) {
    console.error("voice-test-provider fatal", e);
    return j({ ok: false, error: "internal_error", message: String(e?.message ?? e) }, 200);
  }
});
