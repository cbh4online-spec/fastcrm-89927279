// FastCRM WhatsApp Pro — Webhook abstracto multi-provider
// Recebe eventos de qualquer fornecedor e re-encaminha internamente.
// Por agora delega para o webhook Z-API existente (que já normaliza).
// O caminho de URL é /functions/v1/whatsapp-pro-webhook?provider=zapi&workspace_id=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "zapi";
  const workspaceId = url.searchParams.get("workspace_id");

  let bodyClone: string | null = null;
  try {
    bodyClone = await req.text();
  } catch {
    bodyClone = null;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Log inicial
  try {
    await admin.from("whatsapp_webhook_logs").insert({
      workspace_id: workspaceId,
      event_type: "raw_inbound",
      payload: bodyClone ? safeJson(bodyClone) : {},
      processed: false,
    });
  } catch (_) {
    /* não bloquear */
  }

  // Delegar para o handler do provider
  if (provider === "zapi" || provider === "zapy") {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/whatsapp-zapi-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyClone ?? "{}",
      });
      const text = await resp.text();
      return new Response(text, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e) {
      // Engolir erro — devolver 200 para o provider não fazer retry agressivo
      await admin.from("whatsapp_webhook_logs").insert({
        workspace_id: workspaceId,
        event_type: "delegate_failed",
        payload: bodyClone ? safeJson(bodyClone) : {},
        processed: false,
        error_message: e instanceof Error ? e.message : String(e),
      });
      return new Response(JSON.stringify({ ok: true, fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Provider ainda não implementado — só guarda log
  return new Response(JSON.stringify({ ok: true, message: `provider ${provider} not implemented yet` }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return { _raw: s };
  }
}
