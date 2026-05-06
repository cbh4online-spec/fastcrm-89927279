import type { NormalizedInboundMessage, WhatsAppMessageType } from "../providers/types";

/**
 * Normalizador genérico para payloads inbound.
 * Cada provider faz o seu próprio parse (ver zapiAdapter), mas esta função
 * serve como fallback "best-effort" para payloads desconhecidos no debugging
 * UI (Logs/Webhooks → ver normalizado).
 */
export function normalizeIncomingMessage(raw: unknown): NormalizedInboundMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const phone = String(r.phone ?? r.from ?? r.sender ?? "");
  if (!phone) return null;

  const type = detectType(r);
  const text = extractText(r);
  const media = extractMedia(r);

  return {
    externalMessageId: String(r.messageId ?? r.id ?? `inbound_${Date.now()}`),
    externalThreadId: phone,
    fromPhone: phone,
    fromName:
      (typeof r.senderName === "string" && r.senderName) ||
      (typeof r.name === "string" && r.name) ||
      undefined,
    messageType: type,
    text,
    mediaUrl: media?.url,
    mediaMimeType: media?.mime,
    receivedAt: new Date(),
    raw,
  };
}

function detectType(r: Record<string, unknown>): WhatsAppMessageType {
  if (r.image) return "image";
  if (r.audio) return "audio";
  if (r.video) return "video";
  if (r.document) return "document";
  if (r.location) return "location";
  if (r.contact) return "contact_card";
  return "text";
}

function extractText(r: Record<string, unknown>): string | undefined {
  const t = r.text as { message?: string } | undefined;
  if (typeof t?.message === "string") return t.message;
  if (typeof r.body === "string") return r.body;
  if (typeof r.message === "string") return r.message;
  return undefined;
}

function extractMedia(r: Record<string, unknown>): { url?: string; mime?: string } | null {
  const candidates: Array<{ url?: string; mime?: string }> = [];
  for (const key of ["image", "audio", "video", "document"]) {
    const v = r[key] as Record<string, unknown> | undefined;
    if (!v) continue;
    candidates.push({
      url: (v.url as string) ?? (v.imageUrl as string) ?? (v.audioUrl as string) ?? (v.videoUrl as string) ?? (v.documentUrl as string),
      mime: (v.mimeType as string) ?? (v.mime as string),
    });
  }
  return candidates[0] ?? null;
}
