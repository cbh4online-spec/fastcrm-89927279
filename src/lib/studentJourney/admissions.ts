/** Regras do pipeline comercial de admissões (Fase E). Independente dos estados pedagógico/financeiro/administrativo. */
export const ADMISSION_STAGE_CODES = [
  "new", "to_contact", "contacted", "qualified", "proposal_sent", "enrollment_pending",
  "enrollment_confirmed", "converted", "no_answer", "lost", "future_followup",
] as const;
export type AdmissionStageCode = (typeof ADMISSION_STAGE_CODES)[number];

/** Etapas em que é obrigatório indicar o motivo de perda. */
export function requiresLostReason(code: string | null | undefined): boolean {
  return code === "lost";
}

/** Etapas que permitem criar a inscrição na turma. */
export function allowsEnrollment(code: string | null | undefined): boolean {
  return code === "enrollment_confirmed" || code === "converted";
}

/** Estado CRM da oportunidade derivado da etapa. */
export function statusForStage(code: string | null | undefined): "open" | "won" | "lost" {
  if (code === "converted") return "won";
  if (code === "lost") return "lost";
  return "open";
}

export function validateStageMove(code: string | null | undefined, lostReason: string | null | undefined): string | null {
  if (requiresLostReason(code) && !(lostReason ?? "").trim()) return "Indique o motivo de perda.";
  return null;
}
