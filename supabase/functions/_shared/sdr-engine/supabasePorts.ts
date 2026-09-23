/**
 * Implementação real de SdrPorts sobre Supabase (service role) + transportes
 * existentes (email-send, whatsapp-pro-send) através do contrato de worker.
 * Todas as leituras/escritas filtram por workspace_id (B10).
 */
// deno-lint-ignore-file no-explicit-any
import type { CampaignRow, EnrollmentRow, SdrPorts, TransportResult } from "./executor.ts";
import type { StepLike } from "./content.ts";
import { normalizeEmail, normalizePhone } from "./identity.ts";
import { signWorkerRequest } from "./workerAuth.ts";

const ENROLLMENT_COLS =
  "id, workspace_id, campaign_id, status, current_step, next_send_at, prospect_name, prospect_email, prospect_phone, lead_id, contact_id, conversation_id, created_at";
const TRANSPORT_TIMEOUT_MS = 25_000;

export async function detectPhase1Schema(admin: any): Promise<boolean> {
  const a = await admin.from("sdr_enrollments").select("identity_key, conversation_id").limit(0);
  const b = await admin.from("sdr_campaigns").select("autonomous_send_enabled, email_connection_id, whatsapp_instance_id").limit(0);
  const c = await admin.from("sdr_step_attempts").select("id").limit(0);
  return !a.error && !b.error && !c.error;
}

export interface PortsEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  workerSecret: string | undefined;
  globalSendEnabled: boolean;
  publicAppUrl: string | undefined;
  schemaReady: boolean;
}

async function callTransport(env: PortsEnv, fn: string, workspaceId: string, payload: Record<string, unknown>): Promise<TransportResult> {
  if (!env.workerSecret) return { kind: "rejected", retryable: false, error: "worker_secret_missing" };
  const raw = JSON.stringify(payload);
  const headers = await signWorkerRequest(env.workerSecret, workspaceId, raw);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TRANSPORT_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${env.supabaseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.serviceRoleKey}`, ...headers },
      body: raw,
      signal: ctrl.signal,
    });
  } catch (e) {
    // Sem resposta: não sabemos se o fornecedor aceitou → ambíguo (nunca reenviar às cegas).
    return { kind: "ambiguous", error: `${fn}_no_response:${e instanceof Error ? e.name : "error"}` };
  } finally {
    clearTimeout(t);
  }
  const text = await resp.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* texto */ }
  if (resp.status >= 500 && resp.status !== 500) return { kind: "ambiguous", error: `${fn}_${resp.status}` };
  if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
    return { kind: "rejected", retryable: false, error: `${fn}_${resp.status}:${body?.error ?? text.slice(0, 200)}` };
  }
  if (!resp.ok) return { kind: "rejected", retryable: true, error: `${fn}_${resp.status}:${body?.error ?? text.slice(0, 200)}` };
  if (body?.success === true) return { kind: "accepted", providerMessageId: body.providerMessageId ?? body.messageId ?? null };
  // whatsapp-pro-send devolve 200 + {fallback,error} em falhas controladas: é rejeição, não entrega.
  return { kind: "rejected", retryable: body?.retryable === true, error: `${fn}:${body?.error ?? "unknown"}` };
}

export function createSupabasePorts(admin: any, env: PortsEnv): SdrPorts {
  return {
    now: () => new Date(),
    random: () => Math.random(),
    globalSendEnabled: env.globalSendEnabled,
    schemaReady: env.schemaReady,
    maxAttempts: 3,

    async getEnrollment(ws, id) {
      const { data, error } = await admin.from("sdr_enrollments").select(ENROLLMENT_COLS).eq("id", id).eq("workspace_id", ws).maybeSingle();
      if (error) throw error;
      return data as EnrollmentRow | null;
    },

    async getCampaign(ws, id) {
      const { data, error } = await admin.from("sdr_campaigns")
        .select("id, workspace_id, status, sequence_id, autonomous_send_enabled, email_connection_id, whatsapp_instance_id, email_daily_limit, email_min_interval_seconds, settings")
        .eq("id", id).eq("workspace_id", ws).maybeSingle();
      if (error) throw error;
      return data as CampaignRow | null;
    },

    async getActiveSteps(ws, sequenceId) {
      const { data: seq } = await admin.from("multichannel_sequences").select("id").eq("id", sequenceId).eq("workspace_id", ws).maybeSingle();
      if (!seq) return null;
      const { data, error } = await admin.from("multichannel_sequence_steps").select("*").eq("sequence_id", sequenceId).eq("is_active", true).order("step_order");
      if (error) throw error;
      return (data ?? []) as StepLike[];
    },

    async isSuppressed(e, channel) {
      const email = normalizeEmail(e.prospect_email);
      if (email) {
        const { data: a, error: ea } = await admin.from("sdr_suppressions").select("id").eq("workspace_id", e.workspace_id).ilike("email", email).limit(1);
        const { data: b, error: eb } = await admin.from("suppressed_emails").select("id").ilike("email", email).limit(1);
        if (ea || eb) return true; // fail-closed
        if (a?.length || b?.length) return true;
      }
      if (channel === "whatsapp") {
        const phone = normalizePhone(e.prospect_phone);
        if (!phone) return true;
        const local = phone.startsWith("351") ? phone.slice(3) : phone;
        const { data, error } = await admin.from("whatsapp_optouts").select("id").eq("workspace_id", e.workspace_id)
          .or(`phone.eq.${phone},phone.eq.+${phone},phone.eq.${local}`).limit(1);
        if (error) return true;
        if (data?.length) return true;
      }
      return false;
    },

    async hasInboundReply(e) {
      const ors: string[] = [];
      if (e.conversation_id) ors.push(`id.eq.${e.conversation_id}`);
      if (e.lead_id) ors.push(`lead_id.eq.${e.lead_id}`);
      if (e.contact_id) ors.push(`contact_id.eq.${e.contact_id}`);
      const email = normalizeEmail(e.prospect_email);
      if (email) ors.push(`external_thread_id.eq.${email}`);
      const phone = normalizePhone(e.prospect_phone);
      if (phone) ors.push(`external_thread_id.ilike.%${phone.slice(-9)}%`);
      if (!ors.length) return false;
      const { data: convs, error } = await admin.from("conversations").select("id").eq("workspace_id", e.workspace_id).or(ors.join(",")).limit(50);
      if (error) throw error;
      if (!convs?.length) return false;
      const { data: msgs, error: me } = await admin.from("messages").select("id").eq("workspace_id", e.workspace_id)
        .eq("direction", "inbound").in("conversation_id", convs.map((c: any) => c.id)).gt("created_at", e.created_at).limit(1);
      if (me) throw me;
      return !!msgs?.length;
    },

    async resolveEmailRoute(c, e) {
      if (!c.email_connection_id) return { ok: false, reason: "email_sender_not_configured" };
      const { data: conn } = await admin.from("email_connections").select("id, email_address, is_active")
        .eq("id", c.email_connection_id).eq("workspace_id", c.workspace_id).maybeSingle();
      if (!conn || !conn.is_active) return { ok: false, reason: "email_sender_not_in_workspace_or_inactive" };
      const conversationId = await ensureConversation(admin, e, "email", normalizeEmail(e.prospect_email)!);
      if (!conversationId) return { ok: false, reason: "email_conversation_unresolved" };
      return { ok: true, route: { connectionId: conn.id, conversationId, accountKey: `email:${conn.id}`, maxPerDay: c.email_daily_limit, minIntervalSeconds: c.email_min_interval_seconds } };
    },

    async resolveWhatsAppRoute(c, e) {
      if (!c.whatsapp_instance_id) return { ok: false, reason: "whatsapp_account_not_configured" };
      const { data: inst } = await admin.from("whatsapp_provider_instances").select("id, active")
        .eq("id", c.whatsapp_instance_id).eq("workspace_id", c.workspace_id).maybeSingle();
      if (!inst || !inst.active) return { ok: false, reason: "whatsapp_account_not_in_workspace_or_inactive" };
      const { data: thr } = await admin.from("whatsapp_throttle_settings")
        .select("instance_id, max_per_day, min_interval_seconds, max_interval_seconds, paused")
        .eq("workspace_id", c.workspace_id).or(`instance_id.eq.${inst.id},instance_id.is.null`);
      const t = (thr ?? []).find((x: any) => x.instance_id === inst.id) ?? (thr ?? []).find((x: any) => x.instance_id == null);
      if (!t) return { ok: false, reason: "whatsapp_throttle_not_configured" };
      const phone = normalizePhone(e.prospect_phone)!;
      const conversationId = e.conversation_id ?? null; // Inbox: whatsapp-zapi-send cria/associa a conversa pelo telefone
      return { ok: true, route: { instanceId: inst.id, conversationId, accountKey: `wa:${inst.id}`, maxPerDay: t.max_per_day, minIntervalSeconds: t.min_interval_seconds, maxIntervalSeconds: t.max_interval_seconds, paused: !!t.paused } };
      void phone;
    },

    async claim(e, step) {
      const { data, error } = await admin.rpc("sdr_claim_step_attempt", {
        p_workspace_id: e.workspace_id, p_enrollment_id: e.id, p_campaign_id: e.campaign_id,
        p_step_id: step.id, p_step_order: step.step_order, p_channel: step.channel, p_lease_seconds: 300,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { attemptId: row.attempt_id, status: row.attempt_status, attemptCount: row.attempt_count, claimed: !!row.claimed };
    },

    async reserveSlot(ws, channel, accountKey, attemptId, maxPerDay, minInterval) {
      const { data, error } = await admin.rpc("sdr_reserve_send_slot", {
        p_workspace_id: ws, p_channel: channel, p_account_key: accountKey, p_attempt_id: attemptId,
        p_max_per_day: maxPerDay, p_min_interval_seconds: minInterval, p_timezone: "Europe/Lisbon",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return { allowed: !!row.allowed, reason: row.reason, retryAt: row.retry_at };
    },

    async beginDispatch(attemptId, accountKey) {
      const { data, error } = await admin.rpc("sdr_begin_dispatch", { p_attempt_id: attemptId, p_account_key: accountKey, p_lease_seconds: 120 });
      if (error) throw error;
      return data === true;
    },

    async releaseAttempt(attemptId, patch) {
      await admin.from("sdr_step_attempts").update({ lease_expires_at: null, next_retry_at: patch.next_retry_at ?? null, updated_at: new Date().toISOString() })
        .eq("id", attemptId).eq("status", "reserved");
    },

    async finishAttempt(attemptId, patch) {
      const now = new Date().toISOString();
      const upd: Record<string, unknown> = { ...patch, lease_expires_at: null, updated_at: now };
      if (patch.status === "accepted") upd.accepted_at = now;
      await admin.from("sdr_step_attempts").update(upd).eq("id", attemptId);
    },

    async unsubscribeUrl(e) {
      const email = normalizeEmail(e.prospect_email);
      if (!email || !env.publicAppUrl || !/^https:\/\//.test(env.publicAppUrl)) return null;
      const { data: existing } = await admin.from("email_unsubscribe_tokens").select("token, used_at").eq("email", email).maybeSingle();
      let token = existing?.token as string | undefined;
      if (existing?.used_at) return null; // já cancelou → isSuppressed deveria ter parado; fail-closed
      if (!token) {
        const bytes = crypto.getRandomValues(new Uint8Array(24));
        token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
        const { error } = await admin.from("email_unsubscribe_tokens").insert({ token, email });
        if (error) {
          const { data: again } = await admin.from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
          token = again?.token;
        }
      }
      return token ? `${env.publicAppUrl.replace(/\/$/, "")}/unsubscribe?token=${encodeURIComponent(token)}` : null;
    },

    sendEmail(i) {
      return callTransport(env, "email-send", i.workspaceId, {
        workspaceId: i.workspaceId, connectionId: i.route.connectionId, conversationId: i.route.conversationId,
        to: i.to, subject: i.subject, body: i.html, isHtml: true,
        idempotencyKey: i.attemptId, sdr: { enrollmentId: i.enrollmentId, stepId: i.stepId, attemptId: i.attemptId },
      });
    },

    sendWhatsApp(i) {
      return callTransport(env, "whatsapp-pro-send", i.workspaceId, {
        workspaceId: i.workspaceId, phone: normalizePhone(i.phone), messageType: "text", text: i.text,
        conversationId: i.route.conversationId, contactId: i.contactId, expectedInstanceId: i.route.instanceId,
        metadata: { sdr_enrollment_id: i.enrollmentId, sequence_step_id: i.stepId, sdr_attempt_id: i.attemptId },
      });
    },

    async updateEnrollment(ws, id, patch, expected) {
      const { data, error } = await admin.from("sdr_enrollments").update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id).eq("workspace_id", ws).in("status", expected).select("id");
      if (error) throw error;
      return !!data?.length;
    },

    async log(e, stepId, channel, status, extra) {
      await admin.from("sdr_sequence_step_logs").insert({
        sdr_enrollment_id: e.id, sequence_step_id: stepId, channel, status, workspace_id: e.workspace_id,
        sent_at: extra?.sentAt ?? null, error_message: extra?.error ?? null, metadata: extra?.metadata ?? {},
      });
    },
  };
}

/** Conversa de email explícita no mesmo workspace (reutiliza a da inscrição, senão procura/cria). */
async function ensureConversation(admin: any, e: EnrollmentRow, channel: "email", threadId: string): Promise<string | null> {
  if (e.conversation_id) {
    const { data } = await admin.from("conversations").select("id").eq("id", e.conversation_id).eq("workspace_id", e.workspace_id).maybeSingle();
    if (data) return data.id;
  }
  let q = admin.from("conversations").select("id").eq("workspace_id", e.workspace_id).eq("channel", channel);
  q = e.lead_id ? q.eq("lead_id", e.lead_id) : e.contact_id ? q.eq("contact_id", e.contact_id) : q.eq("external_thread_id", threadId);
  const { data: found } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  let id = found?.id as string | undefined;
  if (!id) {
    const { data: created, error } = await admin.from("conversations").insert({
      workspace_id: e.workspace_id, channel, external_thread_id: threadId, lead_id: e.lead_id, contact_id: e.contact_id, status: "open",
    }).select("id").single();
    if (error) return null;
    id = created.id;
  }
  await admin.from("sdr_enrollments").update({ conversation_id: id }).eq("id", e.id).eq("workspace_id", e.workspace_id);
  return id ?? null;
}
