// FastCRM WhatsApp Pro — Multi-provider webhook receiver
// URL: /functions/v1/whatsapp-pro-webhook?provider=zapi&workspace_id=...&instance_id=...&token=...
// - Loga sempre o payload raw + headers
// - Valida webhook_token contra whatsapp_provider_instances quando configurado
// - Delega para handler específico (Z-API/Zapy: whatsapp-zapi-webhook)
// - Atualiza estado da instância (last_received / last_error)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const providerParam = (url.searchParams.get("provider") ?? "zapi").toLowerCase();
  const workspaceId = url.searchParams.get("workspace_id");
  const instanceIdParam = url.searchParams.get("instance_id");
  const tokenParam = url.searchParams.get("token") ?? req.headers.get("x-webhook-token");

  let bodyRaw: string | null = null;
  try {
    bodyRaw = await req.text();
  } catch {
    bodyRaw = null;
  }

  const headersObj: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    // não logar Authorization
    if (k.toLowerCase() === "authorization") return;
    headersObj[k] = v;
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Resolver instância (por id, ou por workspace+provider)
  let instance: {
    id: string;
    workspace_id: string;
    webhook_token: string | null;
    provider_name: string;
  } | null = null;

  if (instanceIdParam) {
    const { data } = await admin
      .from("whatsapp_provider_instances")
      .select("id, workspace_id, webhook_token, provider_name")
      .eq("id", instanceIdParam)
      .maybeSingle();
    instance = data as typeof instance;
  } else if (workspaceId) {
    const { data } = await admin
      .from("whatsapp_provider_instances")
      .select("id, workspace_id, webhook_token, provider_name")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    instance = data as typeof instance;
  }

  const phone = extractPhone(bodyRaw);
  const eventType = extractEventType(bodyRaw);

  // Log inicial — sempre
  let logId: string | null = null;
  try {
    const { data: ins } = await admin
      .from("whatsapp_webhook_logs")
      .insert({
        workspace_id: instance?.workspace_id ?? workspaceId,
        provider_instance_id: instance?.id ?? null,
        provider_name: instance?.provider_name ?? providerParam,
        event_type: eventType ?? "raw_inbound",
        payload: bodyRaw ? safeJson(bodyRaw) : {},
        headers: headersObj,
        processed: false,
        direction: "inbound",
        phone,
      })
      .select("id")
      .single();
    logId = ins?.id ?? null;
  } catch (_) { /* noop */ }

  // Validação de token (apenas se a instância exige)
  if (instance?.webhook_token && instance.webhook_token !== tokenParam) {
    await markLog(admin, logId, false, "invalid_webhook_token", null);
    return ok({ ok: false, error: "invalid_webhook_token" });
  }

  // Atualizar last_received
  if (instance?.id) {
    await admin
      .from("whatsapp_provider_instances")
      .update({ webhook_last_received_at: new Date().toISOString(), webhook_last_error: null })
      .eq("id", instance.id);
  }

  // Delegar para handler do provider
  if (providerParam === "zapi" || providerParam === "zapy" || providerParam === "z_api") {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-zapi-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyRaw ?? "{}",
      });
      const text = await resp.text();
      await markLog(admin, logId, resp.ok, resp.ok ? null : `delegate_status_${resp.status}`, safeJson(text));
      return new Response(text, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markLog(admin, logId, false, msg, null);
      if (instance?.id) {
        await admin
          .from("whatsapp_provider_instances")
          .update({ webhook_last_error: msg })
          .eq("id", instance.id);
      }
      return ok({ ok: true, fallback: true });
    }
  }

  await markLog(admin, logId, false, `provider_${providerParam}_not_implemented`, null);
  return ok({ ok: true, message: `provider ${providerParam} not implemented yet` });
});

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return { _raw: s }; }
}

function extractPhone(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const p = o.phone ?? o.from ?? o.sender ?? null;
    return p ? String(p) : null;
  } catch { return null; }
}

function extractEventType(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.type) return String(o.type);
    if (o.event) return String(o.event);
    if (o.status) return `status_${String(o.status).toLowerCase()}`;
    if (o.image) return "image";
    if (o.audio) return "audio";
    if (o.video) return "video";
    if (o.document) return "document";
    if (o.text) return "text";
    return null;
  } catch { return null; }
}

async function markLog(
  admin: ReturnType<typeof createClient>,
  logId: string | null,
  processed: boolean,
  error: string | null,
  normalized: unknown,
) {
  if (!logId) return;
  try {
    await admin
      .from("whatsapp_webhook_logs")
      .update({
        processed,
        error_message: error,
        normalized_payload: normalized as never,
      })
      .eq("id", logId);
  } catch (_) { /* noop */ }
}
