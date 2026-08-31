/**
 * SSoT do consentimento WhatsApp (texto legal + versão).
 * O texto e a versão são gravados em `whatsapp_consents` como prova.
 */
export const WHATSAPP_CONSENT_BRAND = "myMIA";

export const WHATSAPP_CONSENT_VERSION = "v1-2026-08";

export const WHATSAPP_CONSENT_TEXT =
  "Autorizo a myMIA a enviar-me pelo WhatsApp informações, conteúdos, novidades e ofertas relacionadas com os seus produtos e serviços. " +
  "Posso retirar o consentimento a qualquer momento respondendo STOP. Consulte a nossa Política de Privacidade.";

export const PRIVACY_POLICY_PATH = "/privacy";

export type WhatsAppConsentStatus = "granted" | "revoked";
export type WhatsAppConsentCategory = "marketing" | "transactional" | "all";
export type WhatsAppConsentSource =
  | "form"
  | "landing_page"
  | "email"
  | "whatsapp_inbound"
  | "manual_import";

export interface WhatsAppConsentRow {
  id: string;
  workspace_id: string;
  phone: string;
  contact_id: string | null;
  lead_id: string | null;
  company_id: string | null;
  status: WhatsAppConsentStatus;
  consent_category: WhatsAppConsentCategory;
  consent_text: string;
  consent_version: string;
  source: WhatsAppConsentSource;
  source_reference: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

/** Normaliza um telefone para comparação (apenas dígitos). */
export function consentPhoneKey(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}
