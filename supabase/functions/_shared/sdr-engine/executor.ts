/**
 * Núcleo do executor SDR (Fase 1) — independente de base de dados e rede.
 * Todas as dependências entram por `SdrPorts`, o que permite testes sem
 * contactar clientes. Implementação real: ./supabasePorts.ts.
 *
 * Invariantes:
 *  - Desligado por defeito (flag global + campaign.autonomous_send_enabled).
 *  - Revalidação completa após a reserva de quota e de novo, transaccionalmente,
 *    em beginDispatch (BD) e na fronteira do transporte (recibo único por despacho).
 *  - Estado de inscrição, campanha, pausa, exclusão e resposta revalidados
 *    imediatamente antes de cada tentativa.
 *  - Uma etapa lógica = uma chave de idempotência (claim atómico).
 *  - Falhas nunca avançam a sequência nem contam como envio.
 *  - Resultado ambíguo (timeout) nunca é reenviado automaticamente.
 *  - Canal não suportado bloqueia de forma explícita.
 */
import { appendUnsubscribeFooter, resolveStepContent, type StepLike } from "./content.ts";
import { nextAllowedAt, parseWindow, retryBackoffMs, scheduleStep, type SendWindow } from "./schedule.ts";

export interface EnrollmentRow {
  id: string;
  workspace_id: string;
  campaign_id: string;
  status: string;
  current_step: number | null;
  next_send_at: string | null;
  prospect_name: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  lead_id: string | null;
  contact_id: string | null;
  conversation_id: string | null;
  created_at: string;
}

export interface CampaignRow {
  id: string;
  workspace_id: string;
  status: string;
  sequence_id: string | null;
  autonomous_send_enabled: boolean | null;
  email_connection_id: string | null;
  whatsapp_instance_id: string | null;
  email_daily_limit: number | null;
  email_min_interval_seconds: number | null;
  settings: Record<string, unknown> | null;
}

export type TransportResult =
  | { kind: "accepted"; providerMessageId: string | null }
  | { kind: "rejected"; retryable: boolean; error: string }
  | { kind: "ambiguous"; error: string };

export interface EmailRoute { connectionId: string; conversationId: string; accountKey: string; maxPerDay: number | null; minIntervalSeconds: number | null }
export interface WhatsAppRoute { instanceId: string; conversationId: string | null; accountKey: string; maxPerDay: number | null; minIntervalSeconds: number | null; maxIntervalSeconds: number | null; paused: boolean }
export type RouteResult<T> = { ok: true; route: T } | { ok: false; reason: string };

export interface ClaimResult { attemptId: string; status: string; attemptCount: number; claimed: boolean }

export type EligibilityResult = { ok: true } | { ok: false; reason: string; terminal: boolean; retryAt?: string | null };
export interface SequenceState { status: string; steps: StepLike[] }

export interface SdrPorts {
  now(): Date;
  random(): number;
  /** Relido em cada revalidação (flag global pode ser removida a meio). */
  isGlobalSendEnabled(): boolean;
  schemaReady: boolean;
  maxAttempts: number;
  getEnrollment(workspaceId: string, id: string): Promise<EnrollmentRow | null>;
  getCampaign(workspaceId: string, id: string): Promise<CampaignRow | null>;
  /** null = sequência não pertence ao workspace. status != 'active' → não executar. */
  getSequence(workspaceId: string, sequenceId: string): Promise<SequenceState | null>;
  isSuppressed(e: EnrollmentRow, channel: "email" | "whatsapp"): Promise<boolean>;
  hasInboundReply(e: EnrollmentRow): Promise<boolean>;
  /** Guardas de contacto (bloqueio, automação, consentimento WhatsApp, stop_contact, reunião…). */
  checkEligibility(e: EnrollmentRow, channel: "email" | "whatsapp"): Promise<EligibilityResult>;
  resolveEmailRoute(c: CampaignRow, e: EnrollmentRow): Promise<RouteResult<EmailRoute>>;
  resolveWhatsAppRoute(c: CampaignRow, e: EnrollmentRow): Promise<RouteResult<WhatsAppRoute>>;
  claim(e: EnrollmentRow, step: StepLike): Promise<ClaimResult>;
  reserveSlot(workspaceId: string, channel: string, accountKey: string, attemptId: string, dispatchNo: number, maxPerDay: number | null, minIntervalSeconds: number | null): Promise<{ allowed: boolean; reason: string; retryAt: string | null }>;
  /** Transacção final: revalida estado + consome reserva do dia. 'ok' ou motivo. */
  beginDispatch(attemptId: string, accountKey: string, expectedStep: number): Promise<string>;
  /** Lança erro se não persistir. */
  releaseAttempt(attemptId: string, patch: { next_retry_at?: string | null }): Promise<void>;
  /**
   * Interrupção temporária (pausa, flag desligada, snooze…): a tentativa continua 'reserved'
   * sem lease, a reserva de quota NÃO consumida é libertada e o motivo fica em last_error.
   * Permite retomar a mesma etapa. Lança erro se não persistir.
   */
  suspendAttempt(attemptId: string, reason: string, nextRetryAt: string | null): Promise<void>;
  /** Transição verificada a partir de `from`; lança erro se não persistir. */
  finishAttempt(attemptId: string, from: string[], patch: { status: string; provider_message_id?: string | null; last_error?: string | null; next_retry_at?: string | null }): Promise<void>;
  unsubscribeUrl(e: EnrollmentRow): Promise<string | null>;
  sendEmail(input: { workspaceId: string; route: EmailRoute; to: string; subject: string; html: string; enrollmentId: string; stepId: string; attemptId: string; dispatchNo: number }): Promise<TransportResult>;
  sendWhatsApp(input: { workspaceId: string; route: WhatsAppRoute; phone: string; text: string; contactId: string | null; enrollmentId: string; stepId: string; attemptId: string; dispatchNo: number }): Promise<TransportResult>;
  /** Actualiza apenas se o estado actual ∈ expectedStatuses (evita sobrepor pausa/resposta concorrente). */
  updateEnrollment(workspaceId: string, id: string, patch: Record<string, unknown>, expectedStatuses: string[]): Promise<boolean>;
  /** Lança erro se a escrita falhar. Nunca escreve sem etapa válida (NOT NULL). */
  log(e: EnrollmentRow, stepId: string | null, channel: string, status: string, extra?: { error?: string | null; metadata?: Record<string, unknown>; sentAt?: string | null }): Promise<void>;
}

export type StepOutcome =
  | "disabled" | "schema_not_ready" | "not_found" | "not_active" | "not_due" | "campaign_inactive"
  | "campaign_autonomous_disabled" | "sequence_inactive" | "config_invalid" | "completed" | "opted_out" | "replied" | "blocked"
  | "outside_window" | "busy" | "deferred_quota" | "deferred_eligibility" | "sent" | "failed_retry" | "failed_final" | "ambiguous";

export interface StepReport { outcome: StepOutcome; reason?: string; enrollmentId: string; warnings?: string[] }

const ACTIVE = ["sequenced"];

export async function runEnrollmentStep(p: SdrPorts, workspaceId: string, enrollmentId: string): Promise<StepReport> {
  const warnings: string[] = [];
  const r = (outcome: StepOutcome, reason?: string): StepReport =>
    (warnings.length ? { outcome, reason, enrollmentId, warnings } : { outcome, reason, enrollmentId });
  const safeLog = async (...args: Parameters<SdrPorts["log"]>) => {
    try { await p.log(...args); } catch (err) { warnings.push(`log_failed:${err instanceof Error ? err.message : String(err)}`); }
  };
  if (!p.isGlobalSendEnabled()) return r("disabled");
  if (!p.schemaReady) return r("schema_not_ready");

  const e = await p.getEnrollment(workspaceId, enrollmentId);
  if (!e || e.workspace_id !== workspaceId) return r("not_found");
  if (!ACTIVE.includes(e.status)) return r("not_active", e.status);
  const now = p.now();
  if (!e.next_send_at || new Date(e.next_send_at).getTime() > now.getTime()) return r("not_due");

  const c = await p.getCampaign(workspaceId, e.campaign_id);
  if (!c || c.workspace_id !== workspaceId) return r("not_found", "campaign");
  if (c.status !== "active") return r("campaign_inactive", c.status);
  if (c.autonomous_send_enabled !== true) return r("campaign_autonomous_disabled");
  if (!c.sequence_id) return block(p, e, null, "unknown", "campaign_without_sequence", safeLog, r);

  const seq = await p.getSequence(workspaceId, c.sequence_id);
  if (!seq) return block(p, e, null, "unknown", "sequence_not_in_workspace", safeLog, r);
  // Sequência pausada/inactiva: não executa e NÃO altera a inscrição (retoma quando reactivada).
  if (seq.status !== "active") return r("sequence_inactive", seq.status);
  const steps = seq.steps;

  // Janela inválida → fail-closed sem alterar a inscrição.
  const window = parseWindow(c.settings?.send_window);
  if (!window) return r("config_invalid", "invalid_send_window");

  const idx = e.current_step ?? 0;
  const step = steps[idx];
  if (!step) {
    await p.updateEnrollment(workspaceId, e.id, { status: "completed", next_send_at: null }, ACTIVE);
    return r("completed");
  }

  if (await p.hasInboundReply(e)) {
    await p.updateEnrollment(workspaceId, e.id, { status: "replied", reply_detected_at: now.toISOString(), next_send_at: null }, ACTIVE);
    await safeLog(e, step.id, step.channel, "exited", { metadata: { exit_reason: "reply" } });
    return r("replied");
  }

  const content = resolveStepContent(step, {
    name: e.prospect_name, first_name: e.prospect_name?.split(/\s+/)[0] ?? null, email: e.prospect_email, phone: e.prospect_phone,
  });
  if (!content.ok) return block(p, e, step, step.channel, (content as { reason: string }).reason, safeLog, r);

  if (await p.isSuppressed(e, content.channel)) {
    await p.updateEnrollment(workspaceId, e.id, { status: "opted_out", opted_out_at: now.toISOString(), next_send_at: null, failure_reason: "suppressed" }, ACTIVE);
    await safeLog(e, step.id, step.channel, "suppressed");
    return r("opted_out");
  }

  const elig = await p.checkEligibility(e, content.channel);
  if (!elig.ok) {
    const f = elig as { reason: string; terminal: boolean; retryAt?: string | null };
    if (f.terminal) return block(p, e, step, content.channel, f.reason, safeLog, r);
    const at = nextAllowedAt(f.retryAt ? new Date(f.retryAt) : new Date(now.getTime() + 3600_000), window);
    if (at) await p.updateEnrollment(workspaceId, e.id, { next_send_at: at.toISOString() }, ACTIVE);
    return r("deferred_eligibility", f.reason);
  }

  const allowedAt = nextAllowedAt(now, window);
  if (!allowedAt) return r("config_invalid", "send_window_unreachable");
  if (allowedAt.getTime() > now.getTime()) {
    await p.updateEnrollment(workspaceId, e.id, { next_send_at: allowedAt.toISOString() }, ACTIVE);
    return r("outside_window");
  }

  let emailRoute: EmailRoute | null = null;
  let waRoute: WhatsAppRoute | null = null;
  if (content.channel === "email") {
    if (!e.prospect_email) return block(p, e, step, "email", "no_email", safeLog, r);
    const rr = await p.resolveEmailRoute(c, e);
    if (!rr.ok) return block(p, e, step, "email", (rr as { reason: string }).reason, safeLog, r);
    emailRoute = rr.route;
  } else {
    if (!e.prospect_phone) return block(p, e, step, "whatsapp", "no_phone", safeLog, r);
    if ((c.settings as Record<string, unknown> | null)?.whatsapp_provider === "ghl") {
      return block(p, e, step, "whatsapp", "ghl_worker_transport_not_supported_phase1", safeLog, r);
    }
    const rr = await p.resolveWhatsAppRoute(c, e);
    if (!rr.ok) return block(p, e, step, "whatsapp", (rr as { reason: string }).reason, safeLog, r);
    waRoute = rr.route;
    if (waRoute.paused) {
      await p.updateEnrollment(workspaceId, e.id, { next_send_at: new Date(now.getTime() + 3600_000).toISOString() }, ACTIVE);
      return r("deferred_quota", "whatsapp_throttle_paused");
    }
  }
  const route = (emailRoute ?? waRoute)!;

  const claim = await p.claim(e, step);
  if (!claim.claimed) {
    if (claim.status === "ambiguous") return block(p, e, step, step.channel, "ambiguous_delivery_requires_review", safeLog, r);
    if (claim.status === "accepted" || claim.status === "delivered") {
      await advance(p, e, steps, idx, now, window);
      return r("sent", "recovered_after_accept");
    }
    if (claim.status === "failed_final" || claim.attemptCount >= p.maxAttempts) {
      await p.updateEnrollment(workspaceId, e.id, { status: "failed", next_send_at: null, failure_reason: "max_attempts" }, ACTIVE);
      return r("failed_final", "max_attempts");
    }
    if (claim.status === "blocked" || claim.status === "cancelled") return block(p, e, step, step.channel, `attempt_${claim.status}`, safeLog, r);
    return r("busy", claim.status);
  }
  const dispatchNo = claim.attemptCount + 1;

  const slot = await p.reserveSlot(workspaceId, content.channel, route.accountKey, claim.attemptId, dispatchNo, route.maxPerDay, route.minIntervalSeconds);
  if (!slot.allowed) {
    if (slot.reason === "quota_not_configured" || slot.reason === "invalid_timezone") {
      await p.finishAttempt(claim.attemptId, ["reserved"], { status: "blocked", last_error: slot.reason });
      return block(p, e, step, content.channel, slot.reason, safeLog, r);
    }
    let retry = slot.retryAt ? new Date(slot.retryAt) : new Date(now.getTime() + 15 * 60_000);
    if (waRoute && waRoute.minIntervalSeconds != null && waRoute.maxIntervalSeconds != null && waRoute.maxIntervalSeconds > waRoute.minIntervalSeconds) {
      retry = new Date(retry.getTime() + (waRoute.maxIntervalSeconds - waRoute.minIntervalSeconds) * 1000 * p.random());
    }
    const at = nextAllowedAt(retry, window);
    if (!at) return r("config_invalid", "send_window_unreachable");
    await p.releaseAttempt(claim.attemptId, { next_retry_at: at.toISOString() });
    await p.updateEnrollment(workspaceId, e.id, { next_send_at: at.toISOString() }, ACTIVE);
    return r("deferred_quota", slot.reason);
  }

  // Revalidação completa imediatamente antes do transporte (a reserva pode ter demorado).
  const pre = await preflight(p, workspaceId, e.id, c.id, c.sequence_id, idx, step.id, content.channel, route.accountKey);
  if (pre) {
    if (pre.temporary) {
      // Pausa/flag/snooze: liberta a quota não consumida e mantém a etapa retomável.
      const retryAt = pre.retryAt ? nextAllowedAt(new Date(pre.retryAt), window) : null;
      await p.suspendAttempt(claim.attemptId, `preflight:${pre.reason}`, retryAt?.toISOString() ?? null);
      if (retryAt) await p.updateEnrollment(workspaceId, e.id, { next_send_at: retryAt.toISOString() }, ACTIVE);
      return r(pre.outcome, pre.reason);
    }
    await p.finishAttempt(claim.attemptId, ["reserved"], { status: "cancelled", last_error: `preflight:${pre.reason}` });
    if (pre.outcome === "replied") {
      await p.updateEnrollment(workspaceId, e.id, { status: "replied", reply_detected_at: now.toISOString(), next_send_at: null }, ACTIVE);
    } else if (pre.outcome === "opted_out") {
      await p.updateEnrollment(workspaceId, e.id, { status: "opted_out", opted_out_at: now.toISOString(), next_send_at: null, failure_reason: "suppressed" }, ACTIVE);
    } else if (pre.outcome === "blocked") {
      return block(p, e, step, content.channel, pre.reason, safeLog, r);
    }
    return r(pre.outcome, pre.reason);
  }

  let html = content.channel === "email" ? content.html : "";
  if (content.channel === "email") {
    const url = await p.unsubscribeUrl(e);
    if (!url) {
      await p.finishAttempt(claim.attemptId, ["reserved"], { status: "blocked", last_error: "unsubscribe_not_configured" });
      return block(p, e, step, "email", "unsubscribe_not_configured", safeLog, r);
    }
    html = appendUnsubscribeFooter(html, url);
  }

  // Ponto transaccional: revalida tudo de novo na BD e consome a reserva do dia.
  const begin = await p.beginDispatch(claim.attemptId, route.accountKey, idx);
  if (begin !== "ok") {
    if (begin === "lease_lost") return r("busy", "lease_lost");
    if (TEMPORARY_BEGIN_REFUSALS.has(begin)) {
      const delayed = DELAYED_BEGIN_REFUSALS.has(begin) ? nextAllowedAt(new Date(now.getTime() + 3600_000), window) : null;
      await p.suspendAttempt(claim.attemptId, `begin_dispatch:${begin}`, delayed?.toISOString() ?? null);
      if (delayed) await p.updateEnrollment(workspaceId, e.id, { next_send_at: delayed.toISOString() }, ACTIVE);
      return r(beginOutcome(begin), begin);
    }
    await p.finishAttempt(claim.attemptId, ["reserved"], { status: "cancelled", last_error: `begin_dispatch:${begin}` });
    return r(beginOutcome(begin), begin);
  }

  let res: TransportResult;
  try {
    res = content.channel === "email"
      ? await p.sendEmail({ workspaceId, route: emailRoute!, to: e.prospect_email!, subject: content.subject, html, enrollmentId: e.id, stepId: step.id, attemptId: claim.attemptId, dispatchNo })
      : await p.sendWhatsApp({ workspaceId, route: waRoute!, phone: e.prospect_phone!, text: content.text, contactId: e.contact_id, enrollmentId: e.id, stepId: step.id, attemptId: claim.attemptId, dispatchNo });
  } catch (err) {
    res = { kind: "ambiguous", error: err instanceof Error ? err.message : String(err) };
  }

  if (res.kind === "accepted") {
    // Persistir a aceitação é obrigatório; se falhar, lança e NÃO avança
    // (a tentativa fica 'dispatching' → ambígua no próximo claim → nunca reenviada).
    await p.finishAttempt(claim.attemptId, ["dispatching"], { status: "accepted", provider_message_id: res.providerMessageId });
    await advance(p, e, steps, idx, now, window);
    await safeLog(e, step.id, step.channel, "sent", { sentAt: now.toISOString(), metadata: { delivery_state: "provider_accepted", attempt_id: claim.attemptId, attempt: dispatchNo } });
    return r("sent");
  }

  if (res.kind === "ambiguous") {
    await p.finishAttempt(claim.attemptId, ["dispatching"], { status: "ambiguous", last_error: res.error });
    await p.updateEnrollment(workspaceId, e.id, { status: "blocked", next_send_at: null, failure_reason: "ambiguous_delivery_requires_review" }, ACTIVE);
    await safeLog(e, step.id, step.channel, "failed", { error: `ambiguous: ${res.error}`, metadata: { attempt_id: claim.attemptId, ambiguous: true } });
    return r("ambiguous");
  }

  if (res.retryable && dispatchNo < p.maxAttempts) {
    const retryAt = nextAllowedAt(new Date(now.getTime() + retryBackoffMs(dispatchNo)), window);
    await p.finishAttempt(claim.attemptId, ["dispatching"], { status: retryAt ? "failed_retryable" : "failed_final", last_error: res.error, next_retry_at: retryAt?.toISOString() ?? null });
    if (retryAt) {
      await p.updateEnrollment(workspaceId, e.id, { next_send_at: retryAt.toISOString(), failure_reason: res.error }, ACTIVE);
      await safeLog(e, step.id, step.channel, "failed", { error: res.error, metadata: { attempt_id: claim.attemptId, attempt: dispatchNo, retryable: true } });
      return r("failed_retry", res.error);
    }
  } else {
    await p.finishAttempt(claim.attemptId, ["dispatching"], { status: "failed_final", last_error: res.error });
  }
  await p.updateEnrollment(workspaceId, e.id, { status: "failed", next_send_at: null, failure_reason: res.error }, ACTIVE);
  await safeLog(e, step.id, step.channel, "failed", { error: res.error, metadata: { attempt_id: claim.attemptId, attempt: dispatchNo, retryable: res.retryable } });
  return r("failed_final", res.error);
}

/**
 * temporary=true → interrupção reversível (pausa de campanha/inscrição/sequência, flag global,
 * autonomia desligada, pausa do throttle WhatsApp, snooze/reunião/automação): a tentativa é
 * suspensa e a etapa pode ser retomada. temporary=false → cancelamento definitivo
 * (resposta, exclusão, bloqueio, mudança de etapa).
 */
type Preflight = { outcome: StepOutcome; reason: string; temporary: boolean; retryAt?: string | null } | null;

/** Recusas de sdr_begin_dispatch que são pausas reversíveis (não cancelam a tentativa). */
export const TEMPORARY_BEGIN_REFUSALS = new Set([
  "campaign_inactive", "campaign_autonomous_disabled", "sequence_inactive", "step_inactive",
  "enrollment_paused", "automation_paused", "whatsapp_throttle_paused", "quota_reservation_missing",
]);
/** Destas, as que dependem de terceiros e são reavaliadas mais tarde (não imediatamente). */
const DELAYED_BEGIN_REFUSALS = new Set(["automation_paused", "whatsapp_throttle_paused"]);

function beginOutcome(reason: string): StepOutcome {
  if (reason === "campaign_inactive") return "campaign_inactive";
  if (reason === "campaign_autonomous_disabled") return "campaign_autonomous_disabled";
  if (reason === "sequence_inactive" || reason === "step_inactive") return "sequence_inactive";
  if (reason === "whatsapp_throttle_paused" || reason === "quota_reservation_missing") return "deferred_quota";
  if (reason === "automation_paused") return "deferred_eligibility";
  return "not_active";
}

/** Revalida flag, inscrição, campanha, sequência/etapa, resposta, exclusão, elegibilidade e rota/throttle. */
async function preflight(p: SdrPorts, ws: string, enrollmentId: string, campaignId: string, sequenceId: string, idx: number, stepId: string, channel: "email" | "whatsapp", accountKey: string): Promise<Preflight> {
  const now = p.now().getTime();
  if (!p.isGlobalSendEnabled()) return { outcome: "disabled", reason: "global_flag_off", temporary: true };
  const fe = await p.getEnrollment(ws, enrollmentId);
  if (!fe) return { outcome: "not_active", reason: "state_changed:missing", temporary: false };
  if (fe.status === "paused") return { outcome: "not_active", reason: "state_changed:paused", temporary: true };
  if (fe.status !== "sequenced" || (fe.current_step ?? 0) !== idx) return { outcome: "not_active", reason: `state_changed:${fe.status}`, temporary: false };
  const fc = await p.getCampaign(ws, campaignId);
  if (!fc) return { outcome: "campaign_inactive", reason: "missing", temporary: false };
  if (fc.status !== "active") return { outcome: "campaign_inactive", reason: fc.status, temporary: true };
  if (fc.autonomous_send_enabled !== true) return { outcome: "campaign_autonomous_disabled", reason: "autonomous_disabled", temporary: true };
  if (fc.sequence_id !== sequenceId) return { outcome: "not_active", reason: "sequence_changed", temporary: false };
  const fs = await p.getSequence(ws, sequenceId);
  if (!fs) return { outcome: "sequence_inactive", reason: "missing", temporary: false };
  if (fs.status !== "active") return { outcome: "sequence_inactive", reason: fs.status, temporary: true };
  if (fs.steps[idx]?.id !== stepId) return { outcome: "not_active", reason: "step_changed", temporary: false };
  if (await p.hasInboundReply(fe)) return { outcome: "replied", reason: "reply", temporary: false };
  if (await p.isSuppressed(fe, channel)) return { outcome: "opted_out", reason: "suppressed", temporary: false };
  const el = await p.checkEligibility(fe, channel);
  if (!el.ok) {
    const f = el as { reason: string; terminal: boolean; retryAt?: string | null };
    if (f.terminal) return { outcome: "blocked", reason: f.reason, temporary: false };
    return { outcome: "deferred_eligibility", reason: f.reason, temporary: true, retryAt: f.retryAt ?? new Date(now + 3600_000).toISOString() };
  }
  if (channel === "whatsapp") {
    // Resolve de novo a rota: uma pausa em whatsapp_throttle_settings surgida depois da reserva trava o envio.
    const rr = await p.resolveWhatsAppRoute(fc, fe);
    if (!rr.ok) return { outcome: "deferred_quota", reason: (rr as { reason: string }).reason, temporary: true, retryAt: new Date(now + 3600_000).toISOString() };
    if (rr.route.paused) return { outcome: "deferred_quota", reason: "whatsapp_throttle_paused", temporary: true, retryAt: new Date(now + 3600_000).toISOString() };
    if (rr.route.accountKey !== accountKey) return { outcome: "deferred_quota", reason: "whatsapp_route_changed", temporary: true };
  }
  return null;
}

async function advance(p: SdrPorts, e: EnrollmentRow, steps: StepLike[], idx: number, now: Date, window: SendWindow) {
  const next = steps[idx + 1];
  const base = { current_step: idx + 1, last_attempt_at: now.toISOString(), failure_reason: null };
  if (next) {
    const at = scheduleStep(now, next, window);
    if (!at) {
      await p.updateEnrollment(e.workspace_id, e.id, { ...base, status: "blocked", next_send_at: null, failure_reason: "send_window_unreachable" }, ACTIVE);
      return;
    }
    await p.updateEnrollment(e.workspace_id, e.id, { ...base, next_send_at: at.toISOString() }, ACTIVE);
  } else {
    await p.updateEnrollment(e.workspace_id, e.id, { ...base, status: "completed", next_send_at: null }, ACTIVE);
  }
}

async function block(
  p: SdrPorts, e: EnrollmentRow, step: StepLike | null, channel: string, reason: string,
  safeLog: (...a: Parameters<SdrPorts["log"]>) => Promise<void>, r: (o: StepOutcome, reason?: string) => StepReport,
): Promise<StepReport> {
  await p.updateEnrollment(e.workspace_id, e.id, { status: "blocked", next_send_at: null, failure_reason: reason }, ACTIVE);
  // Sem etapa válida não há registo em sdr_sequence_step_logs (NOT NULL); o motivo fica em failure_reason.
  if (step) await safeLog(e, step.id, channel, "blocked", { error: reason });
  return r("blocked", reason);
}

/** Primeira data de envio para uma inscrição nova (B02). null se não houver etapas ou a janela for inválida. */
export function firstSendAt(steps: StepLike[], now: Date, rawWindow: unknown): Date | null {
  const first = steps[0];
  if (!first) return null;
  const w = parseWindow(rawWindow);
  if (!w) return null;
  return scheduleStep(now, first, w);
}
