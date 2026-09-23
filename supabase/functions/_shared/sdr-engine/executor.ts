/**
 * Núcleo do executor SDR (Fase 1) — independente de base de dados e rede.
 * Todas as dependências entram por `SdrPorts`, o que permite testes sem
 * contactar clientes. Implementação real: ./supabasePorts.ts.
 *
 * Invariantes:
 *  - Desligado por defeito (globalSendEnabled + campaign.autonomous_send_enabled).
 *  - Estado de inscrição, campanha, pausa, exclusão e resposta revalidados
 *    imediatamente antes de cada tentativa.
 *  - Uma etapa lógica = uma chave de idempotência (claim atómico).
 *  - Falhas nunca avançam a sequência nem contam como envio.
 *  - Resultado ambíguo (timeout) nunca é reenviado automaticamente.
 *  - Canal não suportado bloqueia de forma explícita.
 */
import { appendUnsubscribeFooter, resolveStepContent, type StepLike } from "./content.ts";
import { nextAllowedAt, parseWindow, retryBackoffMs, scheduleStep } from "./schedule.ts";

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

export interface SdrPorts {
  now(): Date;
  random(): number;
  globalSendEnabled: boolean;
  schemaReady: boolean;
  maxAttempts: number;
  getEnrollment(workspaceId: string, id: string): Promise<EnrollmentRow | null>;
  getCampaign(workspaceId: string, id: string): Promise<CampaignRow | null>;
  getActiveSteps(workspaceId: string, sequenceId: string): Promise<StepLike[] | null>;
  isSuppressed(e: EnrollmentRow, channel: "email" | "whatsapp"): Promise<boolean>;
  hasInboundReply(e: EnrollmentRow): Promise<boolean>;
  resolveEmailRoute(c: CampaignRow, e: EnrollmentRow): Promise<RouteResult<EmailRoute>>;
  resolveWhatsAppRoute(c: CampaignRow, e: EnrollmentRow): Promise<RouteResult<WhatsAppRoute>>;
  claim(e: EnrollmentRow, step: StepLike): Promise<ClaimResult>;
  reserveSlot(workspaceId: string, channel: string, accountKey: string, attemptId: string, maxPerDay: number | null, minIntervalSeconds: number | null): Promise<{ allowed: boolean; reason: string; retryAt: string | null }>;
  beginDispatch(attemptId: string, accountKey: string): Promise<boolean>;
  releaseAttempt(attemptId: string, patch: { next_retry_at?: string | null }): Promise<void>;
  finishAttempt(attemptId: string, patch: { status: string; provider_message_id?: string | null; last_error?: string | null; next_retry_at?: string | null }): Promise<void>;
  unsubscribeUrl(e: EnrollmentRow): Promise<string | null>;
  sendEmail(input: { workspaceId: string; route: EmailRoute; to: string; subject: string; html: string; enrollmentId: string; stepId: string; attemptId: string }): Promise<TransportResult>;
  sendWhatsApp(input: { workspaceId: string; route: WhatsAppRoute; phone: string; text: string; contactId: string | null; enrollmentId: string; stepId: string; attemptId: string }): Promise<TransportResult>;
  /** Actualiza apenas se o estado actual ∈ expectedStatuses (evita sobrepor pausa/resposta concorrente). */
  updateEnrollment(workspaceId: string, id: string, patch: Record<string, unknown>, expectedStatuses: string[]): Promise<boolean>;
  log(e: EnrollmentRow, stepId: string | null, channel: string, status: string, extra?: { error?: string | null; metadata?: Record<string, unknown>; sentAt?: string | null }): Promise<void>;
}

export type StepOutcome =
  | "disabled" | "schema_not_ready" | "not_found" | "not_active" | "not_due" | "campaign_inactive"
  | "campaign_autonomous_disabled" | "completed" | "opted_out" | "replied" | "blocked"
  | "outside_window" | "busy" | "deferred_quota" | "sent" | "failed_retry" | "failed_final" | "ambiguous";

export interface StepReport { outcome: StepOutcome; reason?: string; enrollmentId: string }

const ACTIVE = ["sequenced"];

export async function runEnrollmentStep(p: SdrPorts, workspaceId: string, enrollmentId: string): Promise<StepReport> {
  const r = (outcome: StepOutcome, reason?: string): StepReport => ({ outcome, reason, enrollmentId });
  if (!p.globalSendEnabled) return r("disabled");
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
  if (!c.sequence_id) return block(p, e, null, "unknown", "campaign_without_sequence");

  const steps = await p.getActiveSteps(workspaceId, c.sequence_id);
  if (!steps) return block(p, e, null, "unknown", "sequence_not_in_workspace");
  const idx = e.current_step ?? 0;
  const step = steps[idx];
  if (!step) {
    await p.updateEnrollment(workspaceId, e.id, { status: "completed", next_send_at: null }, ACTIVE);
    return r("completed");
  }

  // Resposta e exclusão revalidadas antes de qualquer tentativa.
  if (await p.hasInboundReply(e)) {
    await p.updateEnrollment(workspaceId, e.id, { status: "replied", reply_detected_at: now.toISOString(), next_send_at: null }, ACTIVE);
    await p.log(e, step.id, step.channel, "exited", { metadata: { exit_reason: "reply" } });
    return r("replied");
  }

  const content = resolveStepContent(step, {
    name: e.prospect_name, first_name: e.prospect_name?.split(/\s+/)[0] ?? null, email: e.prospect_email, phone: e.prospect_phone,
  });
  if (!content.ok) return block(p, e, step, step.channel, content.reason);

  if (await p.isSuppressed(e, content.channel)) {
    await p.updateEnrollment(workspaceId, e.id, { status: "opted_out", opted_out_at: now.toISOString(), next_send_at: null, failure_reason: "suppressed" }, ACTIVE);
    await p.log(e, step.id, step.channel, "suppressed");
    return r("opted_out");
  }

  const window = parseWindow(c.settings?.send_window);
  const allowedAt = nextAllowedAt(now, window);
  if (allowedAt.getTime() > now.getTime()) {
    await p.updateEnrollment(workspaceId, e.id, { next_send_at: allowedAt.toISOString() }, ACTIVE);
    return r("outside_window");
  }

  // Rota explícita (conta/remetente/conversa do mesmo workspace).
  let emailRoute: EmailRoute | null = null;
  let waRoute: WhatsAppRoute | null = null;
  if (content.channel === "email") {
    if (!e.prospect_email) return block(p, e, step, "email", "no_email");
    const rr = await p.resolveEmailRoute(c, e);
    if (!rr.ok) return block(p, e, step, "email", rr.reason);
    emailRoute = rr.route;
  } else {
    if (!e.prospect_phone) return block(p, e, step, "whatsapp", "no_phone");
    if ((c.settings as Record<string, unknown> | null)?.whatsapp_provider === "ghl") {
      return block(p, e, step, "whatsapp", "ghl_worker_transport_not_supported_phase1");
    }
    const rr = await p.resolveWhatsAppRoute(c, e);
    if (!rr.ok) return block(p, e, step, "whatsapp", rr.reason);
    waRoute = rr.route;
    if (waRoute.paused) {
      await p.updateEnrollment(workspaceId, e.id, { next_send_at: new Date(now.getTime() + 3600_000).toISOString() }, ACTIVE);
      return r("deferred_quota", "whatsapp_throttle_paused");
    }
  }
  const route = (emailRoute ?? waRoute)!;

  const claim = await p.claim(e, step);
  if (!claim.claimed) {
    if (claim.status === "ambiguous") return block(p, e, step, step.channel, "ambiguous_delivery_requires_review");
    if (claim.status === "accepted" || claim.status === "delivered") {
      // Recuperação: envio já aceite numa execução anterior que caiu antes de avançar.
      await advance(p, e, steps, idx, now, window);
      return r("sent", "recovered_after_accept");
    }
    if (claim.status === "failed_final" || claim.attemptCount >= p.maxAttempts) {
      await p.updateEnrollment(workspaceId, e.id, { status: "failed", next_send_at: null, failure_reason: "max_attempts" }, ACTIVE);
      return r("failed_final", "max_attempts");
    }
    if (claim.status === "blocked" || claim.status === "cancelled") return block(p, e, step, step.channel, `attempt_${claim.status}`);
    return r("busy", claim.status);
  }

  const slot = await p.reserveSlot(workspaceId, content.channel, route.accountKey, claim.attemptId, route.maxPerDay, route.minIntervalSeconds);
  if (!slot.allowed) {
    if (slot.reason === "quota_not_configured") {
      await p.finishAttempt(claim.attemptId, { status: "blocked", last_error: slot.reason });
      return block(p, e, step, content.channel, slot.reason);
    }
    let retry = slot.retryAt ? new Date(slot.retryAt) : new Date(now.getTime() + 15 * 60_000);
    if (waRoute && waRoute.minIntervalSeconds != null && waRoute.maxIntervalSeconds != null && waRoute.maxIntervalSeconds > waRoute.minIntervalSeconds) {
      const jitter = (waRoute.maxIntervalSeconds - waRoute.minIntervalSeconds) * 1000 * p.random();
      retry = new Date(retry.getTime() + jitter);
    }
    retry = nextAllowedAt(retry, window);
    await p.releaseAttempt(claim.attemptId, { next_retry_at: retry.toISOString() });
    await p.updateEnrollment(workspaceId, e.id, { next_send_at: retry.toISOString() }, ACTIVE);
    return r("deferred_quota", slot.reason);
  }

  // Última revalidação (pausa/resposta concorrente) antes de tocar no transporte.
  const fresh = await p.getEnrollment(workspaceId, e.id);
  if (!fresh || fresh.status !== "sequenced" || (fresh.current_step ?? 0) !== idx) {
    await p.finishAttempt(claim.attemptId, { status: "cancelled", last_error: `state_changed:${fresh?.status ?? "missing"}` });
    return r("not_active", fresh?.status ?? "missing");
  }

  let html = content.channel === "email" ? content.html : "";
  if (content.channel === "email") {
    const url = await p.unsubscribeUrl(e);
    if (!url) {
      await p.finishAttempt(claim.attemptId, { status: "blocked", last_error: "unsubscribe_not_configured" });
      return block(p, e, step, "email", "unsubscribe_not_configured");
    }
    html = appendUnsubscribeFooter(html, url);
  }

  if (!(await p.beginDispatch(claim.attemptId, route.accountKey))) return r("busy", "lease_lost");
  const attemptNo = claim.attemptCount + 1;

  let res: TransportResult;
  try {
    res = content.channel === "email"
      ? await p.sendEmail({ workspaceId, route: emailRoute!, to: e.prospect_email!, subject: content.subject, html, enrollmentId: e.id, stepId: step.id, attemptId: claim.attemptId })
      : await p.sendWhatsApp({ workspaceId, route: waRoute!, phone: e.prospect_phone!, text: content.text, contactId: e.contact_id, enrollmentId: e.id, stepId: step.id, attemptId: claim.attemptId });
  } catch (err) {
    res = { kind: "ambiguous", error: err instanceof Error ? err.message : String(err) };
  }

  if (res.kind === "accepted") {
    await p.finishAttempt(claim.attemptId, { status: "accepted", provider_message_id: res.providerMessageId });
    await p.log(e, step.id, step.channel, "sent", { sentAt: now.toISOString(), metadata: { delivery_state: "provider_accepted", attempt_id: claim.attemptId, attempt: attemptNo } });
    await advance(p, e, steps, idx, now, window);
    return r("sent");
  }

  if (res.kind === "ambiguous") {
    await p.finishAttempt(claim.attemptId, { status: "ambiguous", last_error: res.error });
    await p.log(e, step.id, step.channel, "failed", { error: `ambiguous: ${res.error}`, metadata: { attempt_id: claim.attemptId, ambiguous: true } });
    await p.updateEnrollment(workspaceId, e.id, { status: "blocked", next_send_at: null, failure_reason: "ambiguous_delivery_requires_review" }, ACTIVE);
    return r("ambiguous");
  }

  await p.log(e, step.id, step.channel, "failed", { error: res.error, metadata: { attempt_id: claim.attemptId, attempt: attemptNo, retryable: res.retryable } });
  if (res.retryable && attemptNo < p.maxAttempts) {
    const retryAt = nextAllowedAt(new Date(now.getTime() + retryBackoffMs(attemptNo)), window);
    await p.finishAttempt(claim.attemptId, { status: "failed_retryable", last_error: res.error, next_retry_at: retryAt.toISOString() });
    await p.updateEnrollment(workspaceId, e.id, { next_send_at: retryAt.toISOString(), failure_reason: res.error }, ACTIVE);
    return r("failed_retry", res.error);
  }
  await p.finishAttempt(claim.attemptId, { status: "failed_final", last_error: res.error });
  await p.updateEnrollment(workspaceId, e.id, { status: "failed", next_send_at: null, failure_reason: res.error }, ACTIVE);
  return r("failed_final", res.error);
}

async function advance(p: SdrPorts, e: EnrollmentRow, steps: StepLike[], idx: number, now: Date, window: ReturnType<typeof parseWindow>) {
  const next = steps[idx + 1];
  const base = { current_step: idx + 1, last_attempt_at: now.toISOString(), failure_reason: null };
  if (next) {
    await p.updateEnrollment(e.workspace_id, e.id, { ...base, next_send_at: scheduleStep(now, next, window).toISOString() }, ACTIVE);
  } else {
    await p.updateEnrollment(e.workspace_id, e.id, { ...base, status: "completed", next_send_at: null }, ACTIVE);
  }
}

async function block(p: SdrPorts, e: EnrollmentRow, step: StepLike | null, channel: string, reason: string): Promise<StepReport> {
  await p.updateEnrollment(e.workspace_id, e.id, { status: "blocked", next_send_at: null, failure_reason: reason }, ACTIVE);
  await p.log(e, step?.id ?? null, channel, "blocked", { error: reason });
  return { outcome: "blocked", reason, enrollmentId: e.id };
}

/** Primeira data de envio para uma inscrição nova (B02). */
export function firstSendAt(steps: StepLike[], now: Date, rawWindow: unknown): Date | null {
  const first = steps[0];
  if (!first) return null;
  return scheduleStep(now, first, parseWindow(rawWindow));
}
