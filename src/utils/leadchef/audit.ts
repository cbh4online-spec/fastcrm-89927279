/**
 * Tipos e ações canónicas do audit log LeadChef.
 */

export type LeadChefAuditAction =
  | "lead_created"
  | "lead_stage_changed"
  | "appointment_created"
  | "appointment_completed"
  | "referral_created"
  | "referral_converted"
  | "client_followup_created"
  | "goal_updated"
  | "template_used"
  | "import_completed"
  | "export_created"
  | "customer_experience_updated";

export const AUDIT_ACTION_LABELS: Record<LeadChefAuditAction, string> = {
  lead_created: "Lead criado",
  lead_stage_changed: "Etapa alterada",
  appointment_created: "Compromisso criado",
  appointment_completed: "Compromisso concluído",
  referral_created: "Referência criada",
  referral_converted: "Referência convertida",
  client_followup_created: "Follow-up cliente",
  goal_updated: "Objetivo atualizado",
  template_used: "Template usado",
  import_completed: "Importação concluída",
  export_created: "Exportação criada",
  customer_experience_updated: "Experiência cliente atualizada",
};
