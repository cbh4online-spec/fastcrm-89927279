import { normalizeWhatsAppNumber } from "@/hooks/useWhatsAppCall";

/**
 * Estado de WhatsApp para comunicação ASSISTIDA (o utilizador abre e envia à mão).
 * Nunca autoriza envio automático — esse continua a passar pelas guardas do servidor
 * (`_shared/whatsapp-stop-guards.ts`).
 * - has_whatsapp=false/null = "não confirmado", nunca "indisponível".
 * - Bloqueio, opt-out, consentimento revogado ou preferência desligada → fechado.
 * - Enquanto as verificações de opt-out carregam ou falham → fechado (fail-closed).
 */
export type WhatsAppAvailability =
  | "confirmed"
  | "unconfirmed"
  | "invalid_number"
  | "blocked"
  | "opted_out"
  | "consent_revoked"
  | "preference_off"
  | "checking";

export interface WhatsAppAvailabilityInput {
  phone?: string | null;
  whatsappNumber?: string | null;
  hasWhatsapp?: boolean | null;
  isBlocked?: boolean | null;
  /** Existe registo em whatsapp_optouts para este número. */
  optedOut?: boolean | null;
  /** Último registo em whatsapp_consents para este número está "revoked". */
  consentRevoked?: boolean | null;
  /** contact_preferences.whatsapp === false */
  preferenceOff?: boolean | null;
  /** Verificações de opt-out/consentimento ainda a carregar ou com erro. */
  checksPending?: boolean | null;
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
  if (i.optedOut) return { status: "opted_out", number, canOpen: false, label: "Pediu para não receber WhatsApp (opt-out)" };
  if (i.consentRevoked) return { status: "consent_revoked", number, canOpen: false, label: "Consentimento de WhatsApp revogado" };
  if (i.preferenceOff) return { status: "preference_off", number, canOpen: false, label: "Preferência de contacto por WhatsApp desligada" };
  if (i.checksPending) return { status: "checking", number, canOpen: false, label: "A verificar opt-out e consentimento…" };
  if (i.hasWhatsapp) return { status: "confirmed", number, canOpen: true, label: "WhatsApp confirmado" };
  return { status: "unconfirmed", number, canOpen: true, label: "WhatsApp não confirmado — confirme antes de enviar" };
}
