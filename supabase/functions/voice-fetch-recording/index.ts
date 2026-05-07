// voice-fetch-recording — Fase 1P. Obtém metadata de gravação se provider suportar.
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

    const { workspace_id, call_log_id } = await req.json().catch(() => ({}));
    if (!workspace_id || !call_log_id) return j({ error: "workspace_id e call_log_id obrigatórios" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: m } = await admin.from("workspace_members").select("user_id")
      .eq("workspace_id", workspace_id).eq("user_id", claims.claims.sub).maybeSingle();
    if (!m) return j({ error: "Forbidden" }, 403);

    // Compliance check
    const { data: compliance } = await admin.from("voice_compliance_settings").select("*")
      .eq("workspace_id", workspace_id).maybeSingle();
    if (!compliance?.recording_allowed) {
      return j({ ok: false, error: "recording_not_allowed", message: "Recording not available for this workspace configuration." }, 403);
    }

    const { data: call } = await admin.from("voice_call_logs").select("*")
      .eq("id", call_log_id).eq("workspace_id", workspace_id).maybeSingle();
    if (!call) return j({ error: "call not found" }, 404);
    if (!call.provider_call_id || !call.provider_instance_id) {
      return j({ ok: false, message: "Recording not available for this provider/configuration." });
    }

    const { data: instance } = await admin.from("voice_provider_instances").select("*")
      .eq("id", call.provider_instance_id).maybeSingle();
    if (!instance) return j({ error: "instance not found" }, 404);

    const adapter = getAdapter(instance.provider_name);
    const config = buildRuntimeConfig(instance);
    const result = await adapter.getRecording(call.provider_call_id, config);

    if (result.status !== "available" || !result.url) {
      return j({ ok: false, message: "Recording not available for this provider/configuration." });
    }

    await admin.from("voice_call_logs").update({
      recording_url: result.url,
      recording_status: "available",
      recording_duration_seconds: result.durationSeconds ?? null,
    }).eq("id", call.id);

    return j({ ok: true, url: result.url, duration_seconds: result.durationSeconds ?? null });
  } catch (e: any) {
    console.error("voice-fetch-recording fatal", e);
    return j({ ok: false, error: "internal_error", message: String(e?.message ?? e) }, 200);
  }
});
