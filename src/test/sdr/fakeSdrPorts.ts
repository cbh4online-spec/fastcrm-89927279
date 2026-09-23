/**
 * Implementação em memória de SdrPorts para testes (sem rede, sem base de dados).
 * Semântica de claim/quota replica as regras das RPC SQL (validadas à parte
 * contra Postgres local em supabase/pending-migrations/tests).
 */
import type { CampaignRow, ClaimResult, EnrollmentRow, SdrPorts, TransportResult } from "../../../supabase/functions/_shared/sdr-engine/executor";
import type { StepLike } from "../../../supabase/functions/_shared/sdr-engine/content";

export interface Attempt { id: string; key: string; workspace_id: string; enrollment_id: string; status: string; attempt_count: number; lease: number | null; next_retry_at: number | null; provider_message_id?: string | null }

export class FakeWorld {
  now = new Date("2026-09-24T09:30:00Z"); // quinta, 10:30 Lisboa
  enrollments = new Map<string, EnrollmentRow>();
  campaigns = new Map<string, CampaignRow>();
  sequences = new Map<string, { workspace_id: string; steps: StepLike[] }>();
  suppressedEmails = new Set<string>();
  optoutPhones = new Set<string>();
  inboundFor = new Set<string>(); // enrollment ids com resposta
  attempts = new Map<string, Attempt>();
  reservations: { ws: string; channel: string; account: string; day: string; at: number; attempt: string }[] = [];
  logs: { enrollment: string; status: string; error?: string | null }[] = [];
  sent: { channel: string; to: string; workspaceId: string; body: string; account: string }[] = [];
  transport: (channel: string) => Promise<TransportResult> = async () => ({ kind: "accepted", providerMessageId: "pm-1" });
  globalSendEnabled = true;
  schemaReady = true;
  waThrottle: Record<string, { max: number; min: number; maxI: number; paused?: boolean }> = {};
  unsubscribeBase: string | null = "https://app.example/unsubscribe?token=t";
  private seq = 0;

  ports(): SdrPorts {
    const w = this;
    return {
      now: () => w.now,
      random: () => 0,
      get globalSendEnabled() { return w.globalSendEnabled; },
      get schemaReady() { return w.schemaReady; },
      maxAttempts: 3,
      async getEnrollment(ws, id) { const e = w.enrollments.get(id); return e && e.workspace_id === ws ? { ...e } : null; },
      async getCampaign(ws, id) { const c = w.campaigns.get(id); return c && c.workspace_id === ws ? { ...c } : null; },
      async getActiveSteps(ws, sid) { const s = w.sequences.get(sid); return s && s.workspace_id === ws ? s.steps : null; },
      async isSuppressed(e, ch) {
        if (e.prospect_email && w.suppressedEmails.has(e.prospect_email.toLowerCase())) return true;
        return ch === "whatsapp" && !!e.prospect_phone && w.optoutPhones.has(e.prospect_phone);
      },
      async hasInboundReply(e) { return w.inboundFor.has(e.id); },
      async resolveEmailRoute(c) {
        if (!c.email_connection_id) return { ok: false, reason: "email_sender_not_configured" };
        return { ok: true, route: { connectionId: c.email_connection_id, conversationId: "conv-" + c.workspace_id, accountKey: `email:${c.email_connection_id}`, maxPerDay: c.email_daily_limit, minIntervalSeconds: c.email_min_interval_seconds } };
      },
      async resolveWhatsAppRoute(c) {
        if (!c.whatsapp_instance_id) return { ok: false, reason: "whatsapp_account_not_configured" };
        const t = w.waThrottle[c.workspace_id];
        if (!t) return { ok: false, reason: "whatsapp_throttle_not_configured" };
        return { ok: true, route: { instanceId: c.whatsapp_instance_id, conversationId: null, accountKey: `wa:${c.whatsapp_instance_id}`, maxPerDay: t.max, minIntervalSeconds: t.min, maxIntervalSeconds: t.maxI, paused: !!t.paused } };
      },
      async claim(e, step): Promise<ClaimResult> {
        const key = `${e.id}:${step.step_order}:${step.id}`;
        let a = [...w.attempts.values()].find((x) => x.key === key);
        if (!a) { a = { id: `a${++w.seq}`, key, workspace_id: e.workspace_id, enrollment_id: e.id, status: "reserved", attempt_count: 0, lease: null, next_retry_at: null }; w.attempts.set(a.id, a); }
        const t = w.now.getTime();
        if (a.status === "dispatching" && a.lease! < t) { a.status = "ambiguous"; return { attemptId: a.id, status: "ambiguous", attemptCount: a.attempt_count, claimed: false }; }
        if ((a.status === "reserved" || a.status === "failed_retryable") && (a.lease === null || a.lease < t) && (a.next_retry_at === null || a.next_retry_at <= t) && a.attempt_count < 3) {
          a.status = "reserved"; a.lease = t + 300_000; return { attemptId: a.id, status: "reserved", attemptCount: a.attempt_count, claimed: true };
        }
        return { attemptId: a.id, status: a.status, attemptCount: a.attempt_count, claimed: false };
      },
      async reserveSlot(ws, channel, account, attemptId, max, min) {
        if (!max || min == null) return { allowed: false, reason: "quota_not_configured", retryAt: null };
        if (w.reservations.some((r) => r.attempt === attemptId)) return { allowed: true, reason: "already_reserved", retryAt: null };
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(w.now);
        const mine = w.reservations.filter((r) => r.ws === ws && r.channel === channel && r.account === account);
        if (mine.filter((r) => r.day === day).length >= max) return { allowed: false, reason: "daily_limit", retryAt: new Date(w.now.getTime() + 86400_000).toISOString() };
        const last = Math.max(0, ...mine.map((r) => r.at));
        if (last && last > w.now.getTime() - min * 1000) return { allowed: false, reason: "min_interval", retryAt: new Date(last + min * 1000).toISOString() };
        w.reservations.push({ ws, channel, account, day, at: w.now.getTime(), attempt: attemptId });
        return { allowed: true, reason: "reserved", retryAt: null };
      },
      async beginDispatch(id) { const a = w.attempts.get(id)!; if (a.status !== "reserved") return false; a.status = "dispatching"; a.attempt_count++; a.lease = w.now.getTime() + 120_000; return true; },
      async releaseAttempt(id, p) { const a = w.attempts.get(id)!; a.lease = null; a.next_retry_at = p.next_retry_at ? Date.parse(p.next_retry_at) : null; },
      async finishAttempt(id, p) { const a = w.attempts.get(id)!; a.status = p.status; a.lease = null; a.next_retry_at = p.next_retry_at ? Date.parse(p.next_retry_at) : null; a.provider_message_id = p.provider_message_id; },
      async unsubscribeUrl() { return w.unsubscribeBase; },
      async sendEmail(i) { const r = await w.transport("email"); if (r.kind === "accepted") w.sent.push({ channel: "email", to: i.to, workspaceId: i.workspaceId, body: i.html, account: i.route.accountKey }); return r; },
      async sendWhatsApp(i) { const r = await w.transport("whatsapp"); if (r.kind === "accepted") w.sent.push({ channel: "whatsapp", to: i.phone, workspaceId: i.workspaceId, body: i.text, account: i.route.accountKey }); return r; },
      async updateEnrollment(ws, id, patch, expected) {
        const e = w.enrollments.get(id);
        if (!e || e.workspace_id !== ws || !expected.includes(e.status)) return false;
        Object.assign(e, patch); return true;
      },
      async log(e, _s, _c, status, extra) { w.logs.push({ enrollment: e.id, status, error: extra?.error }); },
    };
  }

  addCampaign(id: string, ws: string, over: Partial<CampaignRow> = {}, steps: Partial<StepLike>[] = [{ channel: "email" }]) {
    const seqId = `seq-${id}`;
    this.sequences.set(seqId, { workspace_id: ws, steps: steps.map((s, i) => ({ id: `${id}-s${i}`, step_order: i + 1, channel: "email", subject: "Olá {{first_name}}", body_html: "<p>Olá {{first_name}}</p>", whatsapp_template: "Olá {{first_name}}", delay_days: i === 0 ? 0 : 2, delay_hours: 0, ...s })) });
    this.campaigns.set(id, { id, workspace_id: ws, status: "active", sequence_id: seqId, autonomous_send_enabled: true, email_connection_id: "conn-" + ws, whatsapp_instance_id: "inst-" + ws, email_daily_limit: 20, email_min_interval_seconds: 120, settings: {}, ...over });
  }

  addEnrollment(id: string, ws: string, campaign: string, over: Partial<EnrollmentRow> = {}) {
    this.enrollments.set(id, { id, workspace_id: ws, campaign_id: campaign, status: "sequenced", current_step: 0, next_send_at: new Date(this.now.getTime() - 1000).toISOString(), prospect_name: "Ana Silva", prospect_email: `${id}@exemplo.pt`, prospect_phone: "912345678", lead_id: null, contact_id: null, conversation_id: null, created_at: "2026-09-01T00:00:00Z", ...over });
  }
}
