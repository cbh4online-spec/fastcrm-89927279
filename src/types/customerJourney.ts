// Types for Customer Journey

export type JourneyStage = 
  | 'novo' 
  | 'em_onboarding' 
  | 'em_consumo' 
  | 'em_pausa' 
  | 'concluido' 
  | 'pronto_upsell';

export type ChurnRisk = 'baixo' | 'medio' | 'alto';

export const JOURNEY_STAGE_LABELS: Record<JourneyStage, string> = {
  novo: 'Novo',
  em_onboarding: 'Em Onboarding',
  em_consumo: 'Em Consumo',
  em_pausa: 'Em Pausa',
  concluido: 'Concluído',
  pronto_upsell: 'Pronto para Upsell',
};

export const JOURNEY_STAGE_COLORS: Record<JourneyStage, string> = {
  novo: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  em_onboarding: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  em_consumo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  em_pausa: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  concluido: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
  pronto_upsell: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const JOURNEY_STAGE_ICONS: Record<JourneyStage, string> = {
  novo: '🆕',
  em_onboarding: '📋',
  em_consumo: '▶️',
  em_pausa: '⏸️',
  concluido: '✅',
  pronto_upsell: '🚀',
};

export const CHURN_RISK_LABELS: Record<ChurnRisk, string> = {
  baixo: 'Baixo',
  medio: 'Médio',
  alto: 'Alto',
};

export const CHURN_RISK_COLORS: Record<ChurnRisk, string> = {
  baixo: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  medio: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  alto: 'text-red-600 bg-red-100 dark:bg-red-900/30',
};

export interface CustomerJourney {
  stage: JourneyStage;
  lastInteractionDate: string | null;
  nextRecommendedAction: string | null;
  churnRisk: ChurnRisk;
  // Additional context
  activeProducts: number;
  completedProducts: number;
  totalConsumption: number;
  daysSinceLastInteraction: number | null;
  averageConsumptionFrequency: number | null; // days between consumptions
}
