// whatsapp-send-scheduled-reminders
// Processa lembretes WhatsApp pendentes (manual ou via cron futuro)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const workspaceFilter: string | null = body?.workspace_id ?? null;
    const isManual = !!body?.manual;
    const limit = Math.min(Number(body?.limit ?? 50), 100);

    // Para invocações manuais, validar JWT + membership
    if (isManual) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return ok({ error: "Unauthorized" }, 401);

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error } = await userClient.auth.getClaims(token);
      if (error || !claims?.claims) return ok({ error: "Unauthorized" }, 401);

      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (!workspaceFilter) return ok({ error: "workspace_id obrigatório" }, 400);
      const { data: member } = await admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceFilter)
        .eq("user_id", claims.claims.sub)
        .maybeSingle();
      if (!member) return ok({ error: "Sem permissão neste workspace" }, 403);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let q = admin
      .from("whatsapp_scheduled_reminders")
      .select("*")
      .in("status", ["scheduled", "pending"])
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(limit);

    if (workspaceFilter) q = q.eq("workspace_id", workspaceFilter);

    const { data: due, error } = await q;
    if (error) {
      console.error("[reminders] fetch failed", error);
      return ok({ error: error.message }, 500);
    }

    const reminders = due ?? [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const r of reminders) {
      const reminderId = r.id as string;
      const wsId = r.workspace_id as string;
      const phone = r.to_phone as string | null;

      if (!phone) {
        await admin
          .from("whatsapp_scheduled_reminders")
          .update({
            status: "skipped",
            last_error: "Sem telefone do contacto",
          })
          .eq("id", reminderId);
        skipped += 1;
        continue;
      }

      // Marcar pending para evitar re-processamento
      await admin
        .from("whatsapp_scheduled_reminders")
        .update({ status: "pending", attempts: ((r.attempts as number) ?? 0) + 1 })
        .eq("id", reminderId);

      try {
        const { data: sendRes, error: sendErr } = await admin.functions.invoke(
          "whatsapp-pro-send",
          {
            body: {
              workspace_id: wsId,
              to: phone,
              type: "text",
              text: { body: r.message_content as string },
              conversation_id: r.conversation_id ?? null,
              context: {
                appointment_id: r.appointment_id ?? null,
                reminder_id: reminderId,
                kind: "appointment_reminder",
              },
            },
          },
        );

        if (sendErr || sendRes?.error) {
          throw new Error(sendErr?.message || sendRes?.error || "send failed");
        }

        await admin
          .from("whatsapp_scheduled_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id:
              (sendRes?.message_id as string) ?? (sendRes?.id as string) ?? null,
            last_error: null,
          })
          .eq("id", reminderId);

        sent += 1;

        try {
          await admin.rpc("emit_communication_event", {
            _workspace_id: wsId,
            _event_type: "communication.appointment.reminder_sent",
            _payload: {
              reminder_id: reminderId,
              appointment_id: r.appointment_id ?? null,
              reminder_type: r.reminder_type,
            },
          });
        } catch (_e) {
          // best-effort
        }
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[reminders] send failed", reminderId, msg);
        await admin
          .from("whatsapp_scheduled_reminders")
          .update({
            status: "failed",
            last_error: msg.slice(0, 500),
          })
          .eq("id", reminderId);
      }
    }

    return ok({
      ok: true,
      processed: reminders.length,
      sent,
      failed,
      skipped,
    });
  } catch (e) {
    console.error("[reminders] fatal", e);
    return ok(
      { error: "internal_error", message: e instanceof Error ? e.message : String(e) },
      200,
    );
  }
});
