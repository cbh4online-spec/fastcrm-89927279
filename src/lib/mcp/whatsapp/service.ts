/**
 * Orquestração das ferramentas MCP WhatsApp.
 * Reutiliza a infraestrutura WhatsApp Pro existente (whatsapp-pro-send,
 * whatsapp_scheduled_messages, consentimentos e opt-outs).
 */
import type { WhatsAppMcpGateway, ResolvedEntity } from "./gateway";
import {
  assertCapability,
  assertConsent,
  assertMediaUrl,
  assertScheduledAt,
  assertSingleTarget,
  buildIdempotencyKey,
  McpWhatsAppError,
  MCP_WHATSAPP_READ_CAPABILITY,
  MCP_WHATSAPP_WRITE_CAPABILITY,
  normalizeE164,
  stripSecrets,
  type McpWhatsAppPurpose,
  type TargetInput,
} from "./policy";

const SEND_RATE = { max: 20, windowMs: 60_000 };

export interface ResolvedTarget {
  phone: string;
  contact: ResolvedEntity | null;
  lead: ResolvedEntity | null;
}

async function authorize(
  gateway: WhatsAppMcpGateway,
  workspaceId: string,
  capability: typeof MCP_WHATSAPP_READ_CAPABILITY | typeof MCP_WHATSAPP_WRITE_CAPABILITY,
) {
  const { role, isSuperAdmin } = await gateway.getMembership(workspaceId);
  assertCapability(role, capability, isSuperAdmin);
}

export async function resolveTarget(
  gateway: WhatsAppMcpGateway,
  workspaceId: string,
  input: TargetInput,
): Promise<ResolvedTarget> {
  const kind = assertSingleTarget(input);

  if (kind === "contact_id") {
    const contact = await gateway.getContact(workspaceId, input.contact_id!);
    if (!contact) throw new McpWhatsAppError("target_not_found", "Contacto não encontrado neste workspace.");
    if (!contact.phone) throw new McpWhatsAppError("invalid_phone", "O contacto não tem telefone registado.");
    return { phone: normalizeE164(contact.phone), contact, lead: null };
  }

  if (kind === "lead_id") {
    const lead = await gateway.getLead(workspaceId, input.lead_id!);
    if (!lead) throw new McpWhatsAppError("target_not_found", "Lead não encontrada neste workspace.");
    if (!lead.phone) throw new McpWhatsAppError("invalid_phone", "A lead não tem telefone registado.");
    return { phone: normalizeE164(lead.phone), contact: null, lead };
  }

  const phone = normalizeE164(input.phone!);
  const matches = await gateway.findEntitiesByPhone(workspaceId, phone);
  const contacts = matches.filter((m) => m.kind === "contact");
  const leads = matches.filter((m) => m.kind === "lead");
  if (contacts.length > 1) {
    throw new McpWhatsAppError("target_ambiguous", "Vários contactos com este número — indique contact_id.");
  }
  return { phone, contact: contacts[0] ?? null, lead: contacts.length ? null : leads[0] ?? null };
}

export interface SendParams extends TargetInput {
  workspace_id: string;
  purpose?: McpWhatsAppPurpose;
  idempotency_key?: string;
}

async function guardSend(
  gateway: WhatsAppMcpGateway,
  workspaceId: string,
  target: ResolvedTarget,
  purpose: McpWhatsAppPurpose,
) {
  const [optedOut, hasConsent] = await Promise.all([
    gateway.isOptedOut(workspaceId, target.phone),
    purpose === "marketing" ? gateway.hasConsent(workspaceId, target.phone) : Promise.resolve(true),
  ]);
  assertConsent(purpose, { optedOut, hasConsent });

  const limited = await gateway.isRateLimited(
    `mcp:whatsapp:${workspaceId}:${gateway.getUserId()}`,
    SEND_RATE.max,
    SEND_RATE.windowMs,
  );
  if (limited) throw new McpWhatsAppError("rate_limited", "Limite de envios MCP atingido. Tente mais tarde.");
}

export interface SendOutcome {
  status: "sent" | "duplicate";
  message_id: string | null;
  phone: string;
  contact_id: string | null;
  lead_id: string | null;
  purpose: McpWhatsAppPurpose;
  message_type: "text" | "image" | "video";
}

export async function sendWhatsApp(
  gateway: WhatsAppMcpGateway,
  tool: string,
  params: SendParams & {
    messageType: "text" | "image" | "video";
    text?: string;
    mediaUrl?: string;
    delayMessage?: number;
  },
): Promise<SendOutcome> {
  const workspaceId = params.workspace_id;
  const purpose: McpWhatsAppPurpose = params.purpose ?? "marketing";

  await authorize(gateway, workspaceId, MCP_WHATSAPP_WRITE_CAPABILITY);
  const target = await resolveTarget(gateway, workspaceId, params);

  const mediaUrl = params.mediaUrl
    ? assertMediaUrl(params.mediaUrl, params.messageType === "video" ? "video" : "image")
    : undefined;

  const idempotencyKey = buildIdempotencyKey({
    tool,
    workspaceId,
    userId: gateway.getUserId(),
    phone: target.phone,
    payload: `${params.messageType}|${params.text ?? ""}|${mediaUrl ?? ""}`,
    explicit: params.idempotency_key ?? null,
  });

  const cached = await gateway.lookupIdempotency(workspaceId, idempotencyKey);
  if (cached) {
    return { ...(cached as unknown as SendOutcome), status: "duplicate" };
  }

  await guardSend(gateway, workspaceId, target, purpose);

  const result = await gateway.send({
    workspaceId,
    phone: target.phone,
    contactId: target.contact?.id ?? null,
    messageType: params.messageType,
    text: params.text,
    mediaUrl,
    delayMessage: params.delayMessage,
    metadata: { source: "mcp", tool, purpose, idempotency_key: idempotencyKey },
  });

  if (!result.success) {
    throw new McpWhatsAppError("send_failed", result.error ?? "Falha ao enviar mensagem WhatsApp.");
  }

  const outcome: SendOutcome = {
    status: "sent",
    message_id: result.providerMessageId ?? null,
    phone: target.phone,
    contact_id: target.contact?.id ?? null,
    lead_id: target.lead?.id ?? null,
    purpose,
    message_type: params.messageType,
  };

  await gateway.recordIdempotency(workspaceId, idempotencyKey, tool, { ...outcome });

  const entity = target.contact ?? target.lead;
  if (entity) {
    await gateway.audit({
      workspaceId,
      entityType: entity.kind,
      entityId: entity.id,
      activityType: "message_sent",
      title: `WhatsApp enviado via MCP (${params.messageType})`,
      description: params.text?.slice(0, 280),
      metadata: {
        source: "mcp",
        tool,
        purpose,
        provider_message_id: result.providerMessageId ?? null,
        idempotency_key: idempotencyKey,
      },
    });
  }

  return stripSecrets(outcome);
}

export async function getWhatsAppConversation(
  gateway: WhatsAppMcpGateway,
  params: TargetInput & { workspace_id: string; limit?: number },
) {
  const workspaceId = params.workspace_id;
  await authorize(gateway, workspaceId, MCP_WHATSAPP_READ_CAPABILITY);
  const target = await resolveTarget(gateway, workspaceId, params);
  const conversationId = await gateway.findConversationId(workspaceId, target.phone);
  if (!conversationId) {
    return stripSecrets({ phone: target.phone, conversation_id: null, count: 0, messages: [] });
  }
  const messages = await gateway.listMessages(workspaceId, conversationId, Math.min(params.limit ?? 25, 100));
  return stripSecrets({
    phone: target.phone,
    conversation_id: conversationId,
    contact_id: target.contact?.id ?? null,
    lead_id: target.lead?.id ?? null,
    count: messages.length,
    messages,
  });
}

export async function scheduleWhatsAppMessage(
  gateway: WhatsAppMcpGateway,
  params: SendParams & { message: string; scheduled_at: string },
) {
  const workspaceId = params.workspace_id;
  const purpose: McpWhatsAppPurpose = params.purpose ?? "marketing";
  await authorize(gateway, workspaceId, MCP_WHATSAPP_WRITE_CAPABILITY);
  const target = await resolveTarget(gateway, workspaceId, params);
  const scheduledAt = assertScheduledAt(params.scheduled_at);

  const idempotencyKey = buildIdempotencyKey({
    tool: "schedule_whatsapp_message",
    workspaceId,
    userId: gateway.getUserId(),
    phone: target.phone,
    payload: `${params.message}|${scheduledAt}`,
    explicit: params.idempotency_key ?? null,
  });
  const cached = await gateway.lookupIdempotency(workspaceId, idempotencyKey);
  if (cached) return stripSecrets({ ...cached, status: "duplicate" });

  await guardSend(gateway, workspaceId, target, purpose);

  const { id } = await gateway.schedule({
    workspaceId,
    phone: target.phone,
    contactId: target.contact?.id ?? null,
    leadId: target.lead?.id ?? null,
    body: params.message,
    scheduledAt,
    metadata: { source: "mcp", purpose, recurrence: "none", idempotency_key: idempotencyKey },
  });

  const outcome = {
    status: "scheduled" as const,
    scheduled_message_id: id,
    scheduled_at: scheduledAt,
    phone: target.phone,
    contact_id: target.contact?.id ?? null,
    lead_id: target.lead?.id ?? null,
    purpose,
  };
  await gateway.recordIdempotency(workspaceId, idempotencyKey, "schedule_whatsapp_message", { ...outcome });

  const entity = target.contact ?? target.lead;
  if (entity) {
    await gateway.audit({
      workspaceId,
      entityType: entity.kind,
      entityId: entity.id,
      activityType: "custom",
      title: "Mensagem WhatsApp agendada via MCP",
      description: params.message.slice(0, 280),
      metadata: { source: "mcp", purpose, scheduled_at: scheduledAt, scheduled_message_id: id },
    });
  }

  return stripSecrets(outcome);
}
