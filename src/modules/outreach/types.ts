/**
 * Módulo "Contacto 1:1 validado".
 * Comunicação personalizada e responsável — sempre assistida, nunca automática.
 */

export type OutreachEntityType = "company" | "contact" | "lead";

export type OutreachChannel = "email" | "whatsapp" | "social";

export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email assistido",
  whatsapp: "WhatsApp assistido",
  social: "Redes sociais assistidas",
};

export const OUTREACH_LEGAL_BASIS = [
  { value: "consent", label: "Consentimento explícito" },
  { value: "contract", label: "Execução de contrato" },
  { value: "legitimate_interest", label: "Interesse legítimo (B2B)" },
  { value: "legal_obligation", label: "Obrigação legal" },
] as const;

export interface OutreachSettings {
  id: string;
  workspace_id: string;
  user_id: string | null;
  daily_limit: number;
  per_company_limit: number;
  cooldown_days: number;
}

export interface OutreachValidation {
  id: string;
  workspace_id: string;
  entity_type: OutreachEntityType;
  entity_id: string;
  is_validated: boolean;
  legal_basis: string | null;
  consent_source: string | null;
  consent_recorded_at: string | null;
  allowed_channels: string[];
  notes: string | null;
  validated_by: string | null;
  validated_at: string | null;
}

export interface OutreachDraft {
  id: string;
  workspace_id: string;
  entity_type: OutreachEntityType;
  entity_id: string;
  subject: string | null;
  body: string;
  context_summary: string | null;
  value_proposition: string | null;
  status: "draft" | "reviewed" | "used";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachSuppression {
  id: string;
  workspace_id: string;
  entity_type: OutreachEntityType;
  entity_id: string;
  reason: "opt_out" | "blocked" | "replied" | "manual";
  channel: string | null;
  notes: string | null;
  created_at: string;
}

export interface OutreachEvent {
  id: string;
  workspace_id: string;
  entity_type: OutreachEntityType;
  entity_id: string;
  company_id: string | null;
  channel: string | null;
  event_type: "draft_created" | "draft_updated" | "reviewed" | "assisted_send" | "blocked" | "stopped";
  reason: string | null;
  details: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface OutreachCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
  blocking: boolean;
}
