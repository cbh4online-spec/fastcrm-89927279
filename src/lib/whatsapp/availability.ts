import { normalizeWhatsAppNumber } from "@/hooks/useWhatsAppCall";

/**
 * Estado de WhatsApp de um contacto, sem inventar disponibilidade.
 * - has_whatsapp=true → "confirmed"; false/null é tratado como "não confirmado"
 *   (o campo não distingue "verificado sem WhatsApp" de "nunca verificado").
 */
export type WhatsAppAvailability = "confirmed" | "unconfirmed" | "invalid_number" | "blocked";

export interface WhatsAppAvailabilityInput {
  phone?: string | null;
  whatsappNumber?: string | null;
  hasWhatsapp?: boolean | null;
  isBlocked?: boolean | null;
}

export function resolveWhatsAppAvailability(i: WhatsAppAvailabilityInput): {
  status: WhatsAppAvailability;
  number: string | null;
  canOpen: boolean;
  label: string;
} {
  const number = normalizeWhatsAppNumber(i.whatsappNumber || i.phone || null) || null;
  if (i.isBlocked) return { status: "blocked", number, canOpen: false, label: "Contacto bloqueado — WhatsApp indisponível" };
  if (!number) return { status: "invalid_number", number: null, canOpen: false, label: "Sem número válido para WhatsApp" };
  if (i.hasWhatsapp) return { status: "confirmed", number, canOpen: true, label: "WhatsApp confirmado" };
  return { status: "unconfirmed", number, canOpen: true, label: "WhatsApp não confirmado — confirme antes de enviar" };
}
