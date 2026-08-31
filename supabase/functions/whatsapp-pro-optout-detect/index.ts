// FastCRM WhatsApp Pro — Opt-out auto-detector
// Scans recent inbound messages for opt-out keywords (STOP, SAIR, CANCELAR,
// PARAR, UNSUBSCRIBE, REMOVER, BAIXA, DESCADASTRAR) and registers the phone
// in whatsapp_optouts. Sends an auto-confirmation back via whatsapp-pro-send.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPTOUT_KEYWORDS = [
  "stop", "sair", "cancelar", "parar", "unsubscribe",
  "remover", "baixa", "descadastrar", "cancel",
];
const OPTIN_KEYWORDS = [
  "subscrever", "voltar", "reactivar", "reativar", "start", "subscribe",
];

const CONFIRM_TEXT =
  "Recebemos o seu pedido. A partir de agora não receberá mais comunicações promocionais. " +
  "Se quiser voltar a receber, responda SUBSCREVER.";

const REOPTIN_TEXT =
  "Bem-vindo de volta. Voltará a receber as nossas comunicações. " +
  "Para sair a qualquer momento responda STOP.";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectKind(text: string): "optout" | "optin" | null {
  const t = (text || "").trim().toLowerCase();
  if (!t) return null;
  // Exact word at start (avoid false positives in long messages)
  const firstWord = t.split(/\s+/)[0]?.replace(/[^\p{L}]/gu, "");
  if (!firstWord) return null;
  if (OPTOUT_KEYWORDS.includes(firstWord)) return "optout";
  if (OPTIN_KEYWORDS.includes(firstWord)) return "optin";
  // Also: short message that is exactly a keyword
  if (t.length <= 24) {
    if (OPTOUT_KEYWORDS.some((k) => t === k)) return "optout";
    if (OPTIN_KEYWORDS.some((k) => t === k)) return "optin";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const lookbackMin = 10;
    const since = new Date(Date.now() - lookbackMin * 60 * 1000).toISOString();

    const { data: messages, error } = await admin
      .from("messages")
      .select("id, conversation_id, workspace_id, content, sent_at, metadata, conversations:conversation_id(id, channel, contact_id, contact_phone)")
      .eq("direction", "inbound")
      .eq("message_type", "text")
      .gte("sent_at", since)
      .order("sent_at", { ascending: true })
      .limit(300);

    if (error) {
      console.error("[wa-optout] query error", error);
      return ok({ ok: false, internal_error: error.message });
    }

    let optouts = 0;
    let optins = 0;
    let skipped = 0;

    for (const msg of messages ?? []) {
      const conv = (msg as any).conversations;
      if (!conv || conv.channel !== "whatsapp") { skipped++; continue; }

      const kind = detectKind(String(msg.content ?? ""));
      if (!kind) { skipped++; continue; }

      // Determine phone (prefer conversation.contact_phone, fall back to metadata.phone)
      const phone = String(
        conv.contact_phone ??
        (msg as any).metadata?.from_phone ??
        (msg as any).metadata?.phone ??
        "",
      ).replace(/\D/g, "");
      if (!phone) { skipped++; continue; }

      if (kind === "optout") {
        // Insert (idempotent via UNIQUE workspace_id+phone)
        const { error: insErr } = await admin
          .from("whatsapp_optouts")
          .insert({
            workspace_id: msg.workspace_id,
            phone,
            source: "auto_keyword",
            reason: `Detectado em msg ${msg.id}: "${String(msg.content).slice(0, 80)}"`,
          });
        if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
          console.warn("[wa-optout] insert error", insErr.message);
        } else {
          optouts++;

          // Revogar consentimento WhatsApp para este número
          try {
            const { data: consents } = await admin
              .from("whatsapp_consents")
              .select("id, phone")
              .eq("workspace_id", msg.workspace_id)
              .eq("status", "granted");
            const ids = (consents ?? [])
              .filter((c: { phone: string }) => String(c.phone).replace(/\D/g, "") === phone)
              .map((c: { id: string }) => c.id);
            if (ids.length > 0) {
              await admin
                .from("whatsapp_consents")
                .update({ status: "revoked", revoked_at: new Date().toISOString() })
                .in("id", ids);
            }
          } catch (e) {
            console.warn("[wa-optout] consent revoke failed", (e as Error).message);
          }

          // Parar campanhas, sequências e mensagens agendadas para este telefone
          try {
            await admin
              .from("whatsapp_campaign_recipients")
              .update({ status: "skipped_optout" })
              .eq("workspace_id", msg.workspace_id)
              .eq("phone", phone)
              .in("status", ["pending", "sending"]);
            await admin
              .from("whatsapp_scheduled_messages")
              .update({ status: "cancelled" })
              .eq("workspace_id", msg.workspace_id)
              .eq("to_phone", phone)
              .eq("status", "pending");
            await admin
              .from("whatsapp_sequence_enrollments")
              .update({ status: "cancelled" })
              .eq("workspace_id", msg.workspace_id)
              .eq("phone", phone)
              .eq("status", "active");
          } catch (e) {
            console.warn("[wa-optout] cancel pending failed", (e as Error).message);
          }

          // Send confirmation

          try {
            await admin.functions.invoke("whatsapp-pro-send", {
              body: {
                workspaceId: msg.workspace_id,
                conversationId: msg.conversation_id,
                contactId: conv.contact_id,
                phone,
                messageType: "text",
                text: CONFIRM_TEXT,
                metadata: { auto_optout_confirmation: true },
              },
            });
          } catch (e) {
            console.warn("[wa-optout] confirm send failed", (e as Error).message);
          }
        }
      } else if (kind === "optin") {
        // Re-opt-in: delete existing optout
        const { data: existing } = await admin
          .from("whatsapp_optouts")
          .select("id")
          .eq("workspace_id", msg.workspace_id)
          .eq("phone", phone)
          .maybeSingle();
        if (existing) {
          await admin.from("whatsapp_optouts").delete().eq("id", existing.id);
          optins++;
          try {
            await admin.functions.invoke("whatsapp-pro-send", {
              body: {
                workspaceId: msg.workspace_id,
                conversationId: msg.conversation_id,
                contactId: conv.contact_id,
                phone,
                messageType: "text",
                text: REOPTIN_TEXT,
                metadata: { auto_optin_confirmation: true },
              },
            });
          } catch (e) {
            console.warn("[wa-optout] re-optin confirm failed", (e as Error).message);
          }
        } else {
          skipped++;
        }
      }
    }

    return ok({ ok: true, scanned: messages?.length ?? 0, optouts, optins, skipped });
  } catch (e) {
    console.error("[wa-optout] fatal", (e as Error).message);
    return ok({ ok: false, fallback: true, error: (e as Error).message });
  }
});
