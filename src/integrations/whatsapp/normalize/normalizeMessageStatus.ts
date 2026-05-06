import type { NormalizedMessageStatus, WhatsAppMessageStatus } from "../providers/types";

const STATUS_MAP: Record<string, WhatsAppMessageStatus> = {
  SENT: "sent",
  DELIVERED: "delivered",
  RECEIVED: "delivered",
  READ: "read",
  PLAYED: "read",
  FAILED: "failed",
  ERROR: "failed",
  QUEUED: "queued",
};

export function normalizeMessageStatus(raw: unknown): NormalizedMessageStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.messageId ?? r.id ?? r.externalMessageId;
  if (!id) return null;

  const rawStatus = String(r.status ?? "").toUpperCase();
  const status = STATUS_MAP[rawStatus] ?? "delivered";

  return {
    externalMessageId: String(id),
    status,
    occurredAt: new Date(),
    raw,
  };
}
