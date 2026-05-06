// communication-create-appointment
// Cria appointment (calendar_events) + agenda lembretes WhatsApp + envio opcional de confirmação
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

type ReminderOffset = "reminder_24h" | "reminder_2h" | "reminder_1h" | "reminder_15m";

interface Body {
  workspace_id: string;
  conversation_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  opportunity_id?: string | null;
  assigned_to?: string | null;
  appointment_type: string;
  title: string;
  description?: string | null;
  scheduled_start: string;
  duration_minutes?: number;
  timezone?: string;
  location?: string | null;
  meeting_link?: string | null;
  internal_notes?: string | null;
  reminders?: ReminderOffset[];
  send_confirmation?: boolean;
  confirmation_message?: string | null;
  to_phone?: string | null;
}

const REMINDER_OFFSET_MINUTES: Record<ReminderOffset, number> = {
  reminder_24h: 24 * 60,
  reminder_2h: 2 * 60,
  reminder_1h: 60,
  reminder_15m: 15,
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return ok({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claims?.claims) return ok({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;

    if (!body.workspace_id || !body.title || !body.scheduled_start || !body.appointment_type) {
      return ok({ error: "Campos obrigatórios em falta" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validar membership
    const { data: member } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", body.workspace_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) return ok({ error: "Sem permissão neste workspace" }, 403);

    // Garantir que existe pelo menos um calendário no workspace
    let calendarId: string | null = null;
    const { data: cal } = await admin
      .from("calendars")
      .select("id")
      .eq("workspace_id", body.workspace_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (cal?.id) {
      calendarId = cal.id as string;
    } else {
      const { data: newCal, error: calErr } = await admin
        .from("calendars")
        .insert({
          workspace_id: body.workspace_id,
          name: "Agendamentos",
          color: "#10b981",
          created_by: userId,
        })
        .select("id")
        .single();
      if (calErr) {
        console.error("[create-appointment] calendar create failed", calErr);
      } else {
        calendarId = (newCal?.id as string) ?? null;
      }
    }

    if (!calendarId) return ok({ error: "Não foi possível resolver calendário" }, 500);

    const start = new Date(body.scheduled_start);
    if (Number.isNaN(start.getTime())) return ok({ error: "scheduled_start inválido" }, 400);
    const duration = body.duration_minutes ?? 30;
    const end = new Date(start.getTime() + duration * 60 * 1000);

    const reminderTypes = body.reminders ?? [];

    const reminderSettings = {
      requested: reminderTypes,
      send_confirmation: !!body.send_confirmation,
    };

    const { data: appt, error: apptErr } = await admin
      .from("calendar_events")
      .insert({
        calendar_id: calendarId,
        workspace_id: body.workspace_id,
        title: body.title,
        description: body.description ?? null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: body.location ?? null,
        meeting_url: body.meeting_link ?? null,
        status: "scheduled",
        contact_id: body.contact_id ?? null,
        lead_id: body.lead_id ?? null,
        opportunity_id: body.opportunity_id ?? null,
        appointment_type: body.appointment_type,
        conversation_id: body.conversation_id ?? null,
        duration_minutes: duration,
        assigned_to: body.assigned_to ?? userId,
        timezone: body.timezone ?? "Europe/Lisbon",
        internal_notes: body.internal_notes ?? null,
        reminder_settings: reminderSettings,
        source: "whatsapp_pro",
        created_by: userId,
      })
      .select("*")
      .single();

    if (apptErr) {
      console.error("[create-appointment] insert failed", apptErr);
      return ok({ error: apptErr.message }, 500);
    }

    // Resolver telefone do contacto se não enviado
    let toPhone = body.to_phone ?? null;
    if (!toPhone && body.contact_id) {
      const { data: contact } = await admin
        .from("contacts")
        .select("phone, mobile_phone")
        .eq("id", body.contact_id)
        .maybeSingle();
      toPhone = (contact?.phone as string) ?? (contact?.mobile_phone as string) ?? null;
    }

    // Programar lembretes
    const reminders: Array<Record<string, unknown>> = [];
    for (const type of reminderTypes) {
      const offsetMin = REMINDER_OFFSET_MINUTES[type];
      if (!offsetMin) continue;
      const dueAt = new Date(start.getTime() - offsetMin * 60 * 1000);
      if (dueAt.getTime() <= Date.now()) continue; // já passou
      reminders.push({
        workspace_id: body.workspace_id,
        appointment_id: appt.id,
        conversation_id: body.conversation_id ?? null,
        contact_id: body.contact_id ?? null,
        channel: "whatsapp",
        reminder_type: type,
        message_content: buildReminderMessage(type, body.title, start),
        to_phone: toPhone,
        due_at: dueAt.toISOString(),
        status: "scheduled",
        created_by: userId,
      });
    }

    if (reminders.length > 0) {
      const { error: remErr } = await admin
        .from("whatsapp_scheduled_reminders")
        .insert(reminders);
      if (remErr) console.error("[create-appointment] reminders insert failed", remErr);
    }

    // Envio de confirmação imediato (opcional)
    let confirmationSent = false;
    if (body.send_confirmation && body.confirmation_message && toPhone) {
      try {
        const { error: sendErr } = await admin.functions.invoke("whatsapp-pro-send", {
          body: {
            workspace_id: body.workspace_id,
            to: toPhone,
            type: "text",
            text: { body: body.confirmation_message },
            conversation_id: body.conversation_id ?? null,
            context: { appointment_id: appt.id, kind: "appointment_confirmation" },
          },
        });
        if (!sendErr) {
          confirmationSent = true;
          await admin
            .from("calendar_events")
            .update({ confirmation_sent_at: new Date().toISOString() })
            .eq("id", appt.id);
        }
      } catch (e) {
        console.error("[create-appointment] confirmation send error", e);
      }
    }

    // Emitir evento (best-effort)
    try {
      await admin.rpc("emit_communication_event", {
        _workspace_id: body.workspace_id,
        _event_type: "communication.appointment.created",
        _payload: {
          appointment_id: appt.id,
          conversation_id: body.conversation_id ?? null,
          contact_id: body.contact_id ?? null,
          appointment_type: body.appointment_type,
          confirmation_sent: confirmationSent,
        },
      });
    } catch (_e) {
      // ignore — função pode não existir em alguns ambientes
    }

    return ok({
      ok: true,
      appointment: appt,
      reminders_scheduled: reminders.length,
      confirmation_sent: confirmationSent,
    });
  } catch (e) {
    console.error("[create-appointment] fatal", e);
    return ok(
      {
        error: "internal_error",
        message: e instanceof Error ? e.message : String(e),
      },
      200,
    );
  }
});

function buildReminderMessage(type: ReminderOffset | string, title: string, start: Date) {
  const date = start.toLocaleDateString("pt-PT", { day: "2-digit", month: "long" });
  const time = start.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  switch (type) {
    case "reminder_24h":
      return `Olá! Lembramos do nosso agendamento amanhã: ${title} — ${date} às ${time}. Se precisar de reagendar, basta responder.`;
    case "reminder_2h":
      return `Olá! Faltam cerca de 2 horas para o nosso ${title} (${time}). Até já.`;
    case "reminder_1h":
      return `Olá! Faltam cerca de 1 hora para o nosso ${title} (${time}). Até já.`;
    case "reminder_15m":
      return `Olá! Em 15 minutos começamos o nosso ${title}.`;
    default:
      return `Lembrete: ${title} — ${date} às ${time}.`;
  }
}
