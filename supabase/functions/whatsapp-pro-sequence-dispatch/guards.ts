/**
 * Guardas de paragem do FastCRM WhatsApp Conversion Engine.
 *
 * Revalidadas imediatamente antes de cada envio automático para evitar
 * mensagens indesejadas e condições de corrida.
 */

export type StopReason =
  | "opted_out"
  | "stop_contact"
  | "automation_paused"
  | "lead_replied"
  | "meeting_scheduled"
  | "proposal_accepted"
  | "lead_lost"
  | "snoozed"
  | "unresolved_variables";

export interface GuardResult {
  allowed: boolean;
  reason?: StopReason;
  /** true → o enrollment deve ser terminado; false → apenas adiar. */
  terminal?: boolean;
  /** Novo momento de reavaliação, quando não terminal. */
  retryAt?: string;
}

const ALLOWED: GuardResult = { allowed: true };

interface EnrollmentLike {
  id: string;
  workspace_id: string;
  phone: string;
  contact_id?: string | null;
  enrolled_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Detecta variáveis `{{...}}` não resolvidas no corpo final. */
export function hasUnresolvedVariables(body: string): boolean {
  return /\{\{\s*[\w.-]+\s*\}\}/.test(body);
}

/**
 * Revalida o estado comercial da lead/contacto antes do envio.
 * Recebe o cliente Supabase (service role) já criado pela função.
 */
export async function checkStopConditions(
  supabase: any,
  enr: EnrollmentLike,
  opts: { stopOnReply: boolean },
): Promise<GuardResult> {
  const wsId = enr.workspace_id;

  // 1. Opt-out (fail-closed em caso de dúvida).
  const digits = (enr.phone || "").replace(/\D/g, "");
  const { data: optout } = await supabase
    .from("whatsapp_optouts")
    .select("id")
    .eq("workspace_id", wsId)
    .or(`phone.eq.${enr.phone},phone.eq.${digits}`)
    .maybeSingle();
  if (optout) return { allowed: false, reason: "opted_out", terminal: true };

  // 2. Resposta da lead depois da inscrição.
  if (opts.stopOnReply) {
    const since = enr.enrolled_at ?? new Date(0).toISOString();
    const tail = digits.slice(-9);
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", wsId)
      .eq("channel", "whatsapp")
      .ilike("external_thread_id", `%${tail}%`)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conv?.id) {
      const { data: inbound } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conv.id)
        .eq("direction", "inbound")
        .gt("sent_at", since)
        .limit(1)
        .maybeSingle();
      if (inbound) return { allowed: false, reason: "lead_replied", terminal: true };
    }
  }

  // 3. Estado comercial da lead associada (quando conhecida).
  const leadId = (enr.metadata as any)?.lead_id as string | undefined;
  if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, automation_active, is_blocked, status, archived_at")
      .eq("id", leadId)
      .eq("workspace_id", wsId)
      .maybeSingle();

    if (lead) {
      if (lead.archived_at || lead.is_blocked) {
        return { allowed: false, reason: "stop_contact", terminal: true };
      }
      if (lead.automation_active === false) {
        return { allowed: false, reason: "automation_paused", terminal: true };
      }
      if (typeof lead.status === "string" && /lost|perdid/i.test(lead.status)) {
        return { allowed: false, reason: "lead_lost", terminal: true };
      }
    }

    const { data: profile } = await supabase
      .from("lead_commercial_profile")
      .select("stop_contact, snooze_until")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (profile?.stop_contact) return { allowed: false, reason: "stop_contact", terminal: true };
    if (profile?.snooze_until && new Date(profile.snooze_until) > new Date()) {
      return { allowed: false, reason: "snoozed", terminal: false, retryAt: profile.snooze_until };
    }
  }

  // 4. Reunião futura para este contacto/lead → suspende a prospeção.
  if (enr.contact_id || leadId) {
    let q = supabase
      .from("meetings")
      .select("id")
      .eq("workspace_id", wsId)
      .gt("start_time", new Date().toISOString())
      .not("status", "in", '("cancelled","canceled","no_show")')
      .limit(1);
    q = enr.contact_id ? q.eq("contact_id", enr.contact_id) : q.eq("lead_id", leadId);
    const { data: meeting } = await q.maybeSingle();
    if (meeting) return { allowed: false, reason: "meeting_scheduled", terminal: true };
  }

  return ALLOWED;
}
