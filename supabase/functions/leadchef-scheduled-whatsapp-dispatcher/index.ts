// LeadChef — Scheduled WhatsApp dispatcher
// Cron a cada 5 min. Processa leadchef_scheduled_messages com status='scheduled'
// e scheduled_for <= now(). Pausa se o lead respondeu / mudou de stage.
// Envia via Z-API (whatsapp_zapi_connections) e regista em crm_activities.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Row {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  profile_id: string | null;
  source_appointment_id: string | null;
  template_id: string | null;
  rendered_body: string;
  scheduled_for: string;
  attempts: number;
  metadata: Record<string, unknown>;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function sendViaZapi(
  admin: ReturnType<typeof createClient>,
  workspaceId: string,
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string; payload?: unknown }> {
  const { data: conn } = await admin
    .from("whatsapp_zapi_connections")
    .select("instance_id, instance_token, client_token, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!conn || (conn as any).status !== "connected") {
    return { ok: false, error: "no_whatsapp" };
  }

  const c = conn as any;
  const url = `https://api.z-api.io/instances/${c.instance_id}/token/${c.instance_token}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": c.client_token ?? "",
    },
    body: JSON.stringify({ phone: normalizePhone(phone), message }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `zapi_${res.status}: ${JSON.stringify(body)}` };
  }
  return { ok: true, payload: body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const startedAt = Date.now();
  const summary = { processed: 0, sent: 0, cancelled: 0, failed: 0, errors: 0 };

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number((body as any)?.limit ?? 100), 500);

    const { data: rows, error } = await sb
      .from("leadchef_scheduled_messages")
      .select(
        "id, workspace_id, lead_id, profile_id, source_appointment_id, template_id, rendered_body, scheduled_for, attempts, metadata",
      )
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(limit);
    if (error) throw error;

    for (const row of (rows ?? []) as Row[]) {
      summary.processed++;
      try {
        // Re-validar pausa: lead respondeu desde criação?
        const { data: msg } = await sb
          .from("leadchef_scheduled_messages")
          .select("created_at")
          .eq("id", row.id)
          .maybeSingle();

        const since = (msg as any)?.created_at as string | undefined;

        if (row.lead_id && since) {
          const { data: replies } = await sb
            .from("crm_activities")
            .select("id")
            .eq("lead_id", row.lead_id)
            .in("activity_type", ["lead_reply", "inbound_message", "incoming_message"])
            .gt("created_at", since)
            .limit(1);
          if (replies && replies.length > 0) {
            await sb
              .from("leadchef_scheduled_messages")
              .update({
                status: "cancelled",
                cancel_reason: "lead_replied",
                cancelled_at: new Date().toISOString(),
              })
              .eq("id", row.id);
            summary.cancelled++;
            continue;
          }
        }

        // Stage mudou? (esperamos demo_done quando agendado)
        const expectedStage = (row.metadata as any)?.enrolled_stage as string | undefined;
        if (expectedStage && row.profile_id) {
          const { data: profile } = await sb
            .from("leadchef_lead_profiles")
            .select("stage")
            .eq("id", row.profile_id)
            .maybeSingle();
          const currentStage = (profile as any)?.stage as string | null;
          if (currentStage && currentStage !== expectedStage) {
            await sb
              .from("leadchef_scheduled_messages")
              .update({
                status: "cancelled",
                cancel_reason: "stage_changed",
                cancelled_at: new Date().toISOString(),
                metadata: { ...row.metadata, stage_change: { from: expectedStage, to: currentStage } },
              })
              .eq("id", row.id);
            summary.cancelled++;
            continue;
          }
        }

        // Buscar telefone
        if (!row.lead_id) {
          await sb.from("leadchef_scheduled_messages").update({
            status: "failed",
            cancel_reason: "other",
            last_error: "no_lead_id",
            attempts: row.attempts + 1,
          }).eq("id", row.id);
          summary.failed++;
          continue;
        }

        const { data: lead } = await sb
          .from("leads")
          .select("phone, name")
          .eq("id", row.lead_id)
          .maybeSingle();
        const phone = (lead as any)?.phone as string | null;
        if (!phone || normalizePhone(phone).length < 8) {
          await sb.from("leadchef_scheduled_messages").update({
            status: "failed",
            cancel_reason: "phone_invalid",
            last_error: "phone_missing_or_invalid",
            attempts: row.attempts + 1,
          }).eq("id", row.id);
          summary.failed++;
          continue;
        }

        // Enviar
        const result = await sendViaZapi(sb, row.workspace_id, phone, row.rendered_body);

        if (!result.ok) {
          const newAttempts = row.attempts + 1;
          const finalFail = newAttempts >= 3;
          await sb.from("leadchef_scheduled_messages").update({
            status: finalFail ? "failed" : "scheduled",
            attempts: newAttempts,
            last_error: result.error ?? "send_failed",
            scheduled_for: finalFail
              ? row.scheduled_for
              : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          }).eq("id", row.id);
          if (finalFail) summary.failed++;
          summary.errors++;
          continue;
        }

        await sb.from("leadchef_scheduled_messages").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: row.attempts + 1,
          metadata: { ...row.metadata, zapi_response: result.payload },
        }).eq("id", row.id);

        await sb.from("crm_activities").insert({
          workspace_id: row.workspace_id,
          entity_type: "lead",
          entity_id: row.lead_id,
          lead_id: row.lead_id,
          activity_type: "whatsapp_auto_sent",
          title: "LeadChef: mensagem pós-demo enviada",
          description: row.rendered_body,
          metadata: {
            source: "leadchef_auto_post_demo",
            scheduled_message_id: row.id,
            template_id: row.template_id,
          },
        });

        summary.sent++;
      } catch (innerErr) {
        summary.errors++;
        console.error("[lcsm-dispatcher] row error", row.id, innerErr);
        try {
          await sb.from("leadchef_scheduled_messages").update({
            attempts: row.attempts + 1,
            last_error: (innerErr as Error)?.message ?? "unknown",
          }).eq("id", row.id);
        } catch (_) { /* noop */ }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, duration_ms: Date.now() - startedAt, ...summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[lcsm-dispatcher] fatal", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error)?.message ?? "fatal", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
