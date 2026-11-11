// Recebe o evento «Mensagens» da WAScript e grava na Caixa de Entrada.
// Autenticação: token secreto por organização no URL (?t=). Nunca dispara bots
// nem respostas automáticas — só regista (sem risco de ciclos de envio).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseWascriptInbound } from "../_shared/wascript.ts";
import { findOrCreateWascriptConversation } from "../_shared/wascriptInbox.ts";
import { phoneOptOutVariants } from "../_shared/phoneVariants.ts";

const ok = (b: Record<string, unknown> = {}) => new Response(JSON.stringify({ ok: true, ...b }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function toIso(ts: string | null): string {
  if (!ts) return new Date().toISOString();
  const n = Number(ts);
  const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: corsHeaders });
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[a-f0-9]{32,64}$/.test(token)) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: conn } = await admin.from("whatsapp_wascript_connections").select("workspace_id, status")
    .eq("webhook_token", token).maybeSingle();
  if (!conn || conn.status === "disconnected") return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  const workspaceId = conn.workspace_id as string;

  const rawText = (await req.text()).slice(0, 200_000);
  let raw: unknown = {};
  try { raw = JSON.parse(rawText); } catch { raw = Object.fromEntries(new URLSearchParams(rawText)); }

  // Log técnico (sem bloquear) para diagnosticar o formato recebido.
  try {
    await admin.from("provider_request_logs").insert({
      workspace_id: workspaceId, provider_name: "wascript", direction: "inbound", endpoint: "webhook:mensagens",
      request_payload: raw as Record<string, unknown>, status_code: 200, success: true,
    });
  } catch { /* noop */ }
  await admin.from("whatsapp_wascript_connections").update({ last_inbound_at: new Date().toISOString() }).eq("workspace_id", workspaceId);

  const m = parseWascriptInbound(raw);
  if (m.isGroup) return ok({ skipped: "group" });
  if (!m.phone || !m.text.trim()) return ok({ skipped: "no_phone_or_text" });

  const at = toIso(m.timestamp);
  const direction = m.fromMe ? "outbound" : "inbound";
  const externalId = `wascript:${m.messageId ?? await sha(`${m.phone}|${direction}|${m.text}|${m.timestamp ?? ""}`)}`;

  // Dedupe (inclui ecos das mensagens enviadas pelo próprio FastCRM).
  const { data: dup } = await admin.from("messages").select("id").eq("workspace_id", workspaceId)
    .eq("external_message_id", externalId).limit(1);
  if (dup?.length) return ok({ duplicate: true });
  if (m.fromMe) {
    const since = new Date(Date.now() - 3 * 60_000).toISOString();
    const { data: echo } = await admin.from("messages").select("id").eq("workspace_id", workspaceId)
      .eq("direction", "outbound").eq("content", m.text).gte("sent_at", since)
      .contains("metadata", { source: "wascript" }).limit(1);
    if (echo?.length) return ok({ duplicate: "echo" });
  }

  const variants = phoneOptOutVariants(m.phone);
  const ors = variants.map((v) => `phone.eq.${v}`).join(",");
  const { data: contact } = ors ? await admin.from("contacts").select("id").eq("workspace_id", workspaceId).or(ors).limit(1).maybeSingle() : { data: null };
  let leadId: string | null = null;
  if (!contact && ors) {
    const { data: lead } = await admin.from("leads").select("id").eq("workspace_id", workspaceId).or(ors).limit(1).maybeSingle();
    leadId = lead?.id ?? null;
    if (!leadId && direction === "inbound") {
      const { data: nl } = await admin.from("leads").insert({
        workspace_id: workspaceId, name: m.name || `+${m.phone}`, phone: `+${m.phone}`, source: "whatsapp", status: "new",
      }).select("id").single();
      leadId = nl?.id ?? null;
    }
  }

  const convId = await findOrCreateWascriptConversation(admin, {
    workspaceId, phone: m.phone, name: m.name, preview: m.text, direction, at, contactId: contact?.id ?? null, leadId,
  });
  if (!convId) return ok({ error: "conv_create_failed" });

  const { error } = await admin.from("messages").insert({
    workspace_id: workspaceId, conversation_id: convId, direction, content: m.text, attachments: [],
    sender_id: null, sent_at: at, external_message_id: externalId,
    metadata: { source: "wascript", push_name: m.name, photo: m.photo, origin: m.fromMe ? "whatsapp_web" : "contact" },
  });
  if (error) console.error("[wascript-webhook] msg_insert_failed", error.message);
  return ok({ stored: !error });
});
