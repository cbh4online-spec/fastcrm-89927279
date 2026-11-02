import { JOURNEY_TIMING_CONFIG } from "@/types/sjJourney";

export type JourneySegmentKey =
  | "active_student" | "completed_active" | "eligible_progression" | "strategic_alumni"
  | "inactive" | "activation" | "ready_contact" | "at_risk";

export interface JourneySegmentInput {
  currentState: string;
  isActivationCandidate?: boolean;
  activationPriority: number;
  activationScore: number;
  daysSinceLastActivity: number;
}

export const JOURNEY_SEGMENT_LABELS: Record<JourneySegmentKey, string> = {
  active_student: "Alunos Ativos",
  completed_active: "Concluídos Ativos",
  eligible_progression: "Elegíveis Progressão",
  strategic_alumni: "Alumni Estratégico",
  inactive: "Inativos",
  activation: "Para Ativar",
  ready_contact: "Prontos p/ Contacto",
  at_risk: "Em Risco",
};

export function isJourneySegmentKey(v: string | null): v is JourneySegmentKey {
  return !!v && v in JOURNEY_SEGMENT_LABELS;
}

/** Single rule used by the dashboard counters and the filtered list. */
export function matchesJourneySegment(jp: JourneySegmentInput, key: JourneySegmentKey): boolean {
  switch (key) {
    case "activation": return !!jp.isActivationCandidate;
    case "ready_contact": return jp.activationPriority <= 2 && jp.activationScore > 60;
    case "at_risk": return jp.daysSinceLastActivity > JOURNEY_TIMING_CONFIG.inactivityThresholdDays - 14;
    default: return jp.currentState === key;
  }
}
