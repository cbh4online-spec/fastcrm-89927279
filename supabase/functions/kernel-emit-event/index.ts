// FastCRM Kernel — Emit Event
// Aceita eventos validados contra o registry e cria registo central em kernel_events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      workspace_id,
      event_type,
      entity_type,
      entity_id,
      actor_type = "system",
      actor_user_id = null,
      source_module = null,
      source_table = null,
      source_id = null,
      correlation_id = null,
      causation_id = null,
      idempotency_key = null,
      payload = {},
      metadata = {},
    } = body || {};

    if (!event_type || !entity_type || !entity_id) {
      return json({ ok: false, error: "missing event_type/entity_type/entity_id" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Lookup registry (best effort)
    const { data: reg } = await supabase
      .from("kernel_event_registry")
      .select("category,domain,severity_default,status")
      .eq("event_type", event_type)
      .maybeSingle();

    const sanitized = sanitize(payload);

    const { data, error } = await supabase
      .from("kernel_events")
      .insert({
        workspace_id,
        type: event_type,
        event_name: event_type,
        entity_kind: entity_type,
        entity_id: String(entity_id),
        actor_type,
        actor_id: actor_user_id ? String(actor_user_id) : null,
        payload: sanitized,
        metadata_json: metadata,
        source_module,
        source_table,
        source_id,
        correlation_id,
        causation_id,
        idempotency_key,
        category: reg?.category ?? event_type.split(".")[0],
        domain: reg?.domain ?? event_type.split(".")[0],
        severity: reg?.severity_default ?? "info",
        status: "pending",
        occurred_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    // Fire-and-forget process
    supabase.functions
      .invoke("kernel-process-event", { body: { event_id: data.id } })
      .catch(() => {});

    return json({ ok: true, event_id: data.id, registered: !!reg });
  } catch (err) {
    console.error("[kernel-emit-event]", err);
    return json({ ok: false, fallback: true, error: (err as Error).message }, 200);
  }
});

function sanitize(p: Record<string, unknown>): Record<string, unknown> {
  if (!p || typeof p !== "object") return {};
  const masked = { ...p };
  const keys = ["api_key", "apikey", "token", "access_token", "refresh_token", "secret", "password", "authorization", "cookies", "cookie", "private_key"];
  for (const k of keys) if (k in masked) masked[k] = "***REDACTED***";
  return masked;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
