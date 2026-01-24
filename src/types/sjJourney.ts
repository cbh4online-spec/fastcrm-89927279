// ============================================
// STUDENT JOURNEY - NON-LINEAR JOURNEY MODEL
// ============================================
// "Concluído" NÃO é terminal. É o gatilho para ativação.

import type { SJProfile, SJEnrollment, LifecycleStage } from "./studentJourney";

// ============================================
// JOURNEY STATES (Estados Principais)
// ============================================

export type JourneyState = 
  | 'external_lead'       // Lead externo (nunca foi aluno)
  | 'new_student'         // Novo aluno (primeira inscrição)
  | 'active_student'      // Aluno ativo (em formação)
  | 'completed_active'    // Concluído ATIVO (com histórico, não terminal!)
  | 'eligible_progression'// Elegível para progressão (pronto para próximo curso)
  | 'inactive'            // Inativo (sem atividade recente)
  | 'strategic_alumni';   // Alumni estratégico (múltiplos cursos, alto valor)

// Mapeamento de lifecycle_stage para JourneyState
export const LIFECYCLE_TO_JOURNEY_STATE: Record<LifecycleStage, JourneyState> = {
  lead: 'external_lead',
  prospect: 'external_lead',
  new_student: 'new_student',
  enrolled: 'new_student',
  active: 'active_student',
  active_student: 'active_student',
  completed: 'completed_active',
  completed_active: 'completed_active',
  eligible_progression: 'eligible_progression',
  inactive: 'inactive',
  churned: 'inactive',
  alumni: 'strategic_alumni'
};

// ============================================
// JOURNEY STATE CONFIG
// ============================================

export interface JourneyStateConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  isTerminal: boolean; // IMPORTANT: Only 'churned' is truly terminal
  canProgressTo: JourneyState[];
  activationPriority: number; // 1 = highest priority for activation
}

export const JOURNEY_STATE_CONFIG: Record<JourneyState, JourneyStateConfig> = {
  external_lead: {
    label: 'Lead Externo',
    description: 'Potencial aluno que ainda não iniciou formação',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: 'UserPlus',
    isTerminal: false,
    canProgressTo: ['new_student'],
    activationPriority: 2
  },
  new_student: {
    label: 'Novo Aluno',
    description: 'Aluno que se inscreveu recentemente',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    icon: 'UserCheck',
    isTerminal: false,
    canProgressTo: ['active_student', 'inactive'],
    activationPriority: 3
  },
  active_student: {
    label: 'Aluno Ativo',
    description: 'Em formação ativa',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: 'BookOpen',
    isTerminal: false,
    canProgressTo: ['completed_active', 'inactive'],
    activationPriority: 4
  },
  completed_active: {
    label: 'Concluído Ativo',
    description: 'Completou formação - PRONTO para nova jornada!',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    icon: 'GraduationCap',
    isTerminal: false, // NOT TERMINAL!
    canProgressTo: ['eligible_progression', 'strategic_alumni', 'new_student', 'inactive'],
    activationPriority: 1 // HIGHEST PRIORITY - ready for activation
  },
  eligible_progression: {
    label: 'Elegível Progressão',
    description: 'Passou período de reflexão, pronto para próxima formação',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
    icon: 'TrendingUp',
    isTerminal: false,
    canProgressTo: ['new_student', 'strategic_alumni', 'inactive'],
    activationPriority: 1 // HIGHEST PRIORITY
  },
  inactive: {
    label: 'Inativo',
    description: 'Sem atividade recente, requer reativação',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    borderColor: 'border-gray-300 dark:border-gray-600',
    icon: 'Pause',
    isTerminal: false, // Can be reactivated!
    canProgressTo: ['new_student', 'active_student', 'eligible_progression'],
    activationPriority: 2
  },
  strategic_alumni: {
    label: 'Alumni Estratégico',
    description: 'Alto valor, múltiplos cursos, relacionamento contínuo',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    borderColor: 'border-violet-300 dark:border-violet-700',
    icon: 'Crown',
    isTerminal: false, // Always can do more!
    canProgressTo: ['new_student', 'inactive'],
    activationPriority: 2
  }
};

// ============================================
// TRANSITION TRIGGERS
// ============================================

export type TransitionTrigger = 
  | 'enrollment_created'    // Nova inscrição
  | 'enrollment_started'    // Iniciou formação
  | 'enrollment_completed'  // Completou formação
  | 'enrollment_dropped'    // Desistiu
  | 'cooling_period_ended'  // Período de reflexão terminou
  | 'inactivity_threshold'  // Sem atividade por X dias
  | 'touchpoint_recorded'   // Novo touchpoint registado
  | 'manual_transition'     // Transição manual
  | 'multiple_completions'; // Completou múltiplos cursos

export interface JourneyTransition {
  from: JourneyState;
  to: JourneyState;
  trigger: TransitionTrigger;
  conditions?: TransitionCondition[];
  autoApply: boolean; // Se true, aplica automaticamente quando trigger ocorre
}

export interface TransitionCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'not_null';
  value: string | number | boolean;
}

// Transições automáticas do sistema
export const JOURNEY_TRANSITIONS: JourneyTransition[] = [
  // Lead → New Student (quando cria inscrição)
  {
    from: 'external_lead',
    to: 'new_student',
    trigger: 'enrollment_created',
    autoApply: true
  },
  // New Student → Active (quando inicia curso)
  {
    from: 'new_student',
    to: 'active_student',
    trigger: 'enrollment_started',
    autoApply: true
  },
  // Active → Completed Active (quando completa)
  {
    from: 'active_student',
    to: 'completed_active',
    trigger: 'enrollment_completed',
    autoApply: true
  },
  // Completed Active → Eligible Progression (após cooling period)
  {
    from: 'completed_active',
    to: 'eligible_progression',
    trigger: 'cooling_period_ended',
    conditions: [
      { field: 'days_since_completion', operator: 'greater_than', value: 14 }
    ],
    autoApply: true
  },
  // Completed Active → Strategic Alumni (múltiplas conclusões)
  {
    from: 'completed_active',
    to: 'strategic_alumni',
    trigger: 'multiple_completions',
    conditions: [
      { field: 'total_courses_completed', operator: 'greater_than', value: 2 }
    ],
    autoApply: true
  },
  // Any → Inactive (sem atividade)
  {
    from: 'completed_active',
    to: 'inactive',
    trigger: 'inactivity_threshold',
    conditions: [
      { field: 'days_since_activity', operator: 'greater_than', value: 90 }
    ],
    autoApply: true
  },
  // Inactive → New Student (reativação)
  {
    from: 'inactive',
    to: 'new_student',
    trigger: 'enrollment_created',
    autoApply: true
  },
  // Eligible Progression → New Student (nova inscrição)
  {
    from: 'eligible_progression',
    to: 'new_student',
    trigger: 'enrollment_created',
    autoApply: true
  },
  // Strategic Alumni → New Student (nova inscrição)
  {
    from: 'strategic_alumni',
    to: 'new_student',
    trigger: 'enrollment_created',
    autoApply: true
  }
];

// ============================================
// JOURNEY PROFILE (Computed State)
// ============================================

export interface JourneyProfile {
  profile: SJProfile;
  currentState: JourneyState;
  previousStates: JourneyStateHistory[];
  stateEnteredAt: string;
  daysInCurrentState: number;
  
  // Activation metrics
  activationPriority: number; // 1-5
  activationScore: number; // 0-100
  isActivationCandidate: boolean;
  
  // Journey stats
  totalEnrollments: number;
  completedEnrollments: number;
  activeEnrollments: number;
  
  // Timing
  daysSinceLastCompletion: number | null;
  daysSinceLastActivity: number;
  daysSinceLastContact: number | null;
  
  // Next actions
  suggestedTransitions: JourneyState[];
  nextBestAction: string | null;
  nextActionDue: string | null;
}

export interface JourneyStateHistory {
  state: JourneyState;
  enteredAt: string;
  exitedAt: string | null;
  trigger: TransitionTrigger | null;
  duration: number; // days
}

// ============================================
// JOURNEY FUNNEL STATS
// ============================================

export interface JourneyFunnelStats {
  external_lead: number;
  new_student: number;
  active_student: number;
  completed_active: number;
  eligible_progression: number;
  inactive: number;
  strategic_alumni: number;
  
  // Key metrics
  activationCandidates: number; // completed_active + eligible_progression
  readyForContact: number; // Profiles that need immediate action
  atRisk: number; // Moving towards inactive
}

// ============================================
// COOLING PERIOD CONFIG
// ============================================

export const JOURNEY_TIMING_CONFIG = {
  coolingPeriodDays: 14,       // Days after completion before suggesting new course
  inactivityThresholdDays: 60, // Days without activity = at risk
  churnThresholdDays: 90,      // Days without activity = inactive
  staleleadDays: 7,            // Days without contact for new lead
  followUpWindowDays: 3        // Days to respond to follow-up
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getJourneyState(profile: SJProfile): JourneyState {
  return LIFECYCLE_TO_JOURNEY_STATE[profile.lifecycle_stage] || 'external_lead';
}

export function getJourneyStateConfig(state: JourneyState): JourneyStateConfig {
  return JOURNEY_STATE_CONFIG[state];
}

export function canTransitionTo(from: JourneyState, to: JourneyState): boolean {
  const config = JOURNEY_STATE_CONFIG[from];
  return config.canProgressTo.includes(to);
}

export function getActivationPriority(state: JourneyState): number {
  return JOURNEY_STATE_CONFIG[state].activationPriority;
}

export function isActivationCandidate(state: JourneyState): boolean {
  return state === 'completed_active' || state === 'eligible_progression';
}

export function getNextBestAction(state: JourneyState, profile: SJProfile): string {
  switch (state) {
    case 'external_lead':
      return 'Qualificar e agendar primeiro contacto';
    case 'new_student':
      return 'Verificar início de formação';
    case 'active_student':
      return 'Acompanhar progresso';
    case 'completed_active':
      return 'Aguardar período de reflexão, preparar proposta';
    case 'eligible_progression':
      return 'Propor próxima formação';
    case 'inactive':
      return 'Campanha de reativação';
    case 'strategic_alumni':
      return 'Manter relacionamento, ofertas exclusivas';
    default:
      return 'Avaliar situação';
  }
}
