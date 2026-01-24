// Student Journey Activation & Growth Engine Types

import { LifecycleStage, SJProfile, SJEnrollment, SJCourse } from "./studentJourney";

// ============================================
// ACTIVATION STATUS
// ============================================

export type ActivationStatus = 
  | 'ready_for_progression'   // Completou curso, pronto para próximo
  | 'cooling_off'              // Recém completou, aguardar período
  | 'engaged'                  // Interação recente
  | 'dormant'                  // Sem atividade há X dias
  | 'at_risk'                  // Indicadores de churn
  | 'new_lead'                 // Novo lead a qualificar
  | 'nurturing';               // Em processo de nutrição

export type ProgressionType = 
  | 'upsell'        // Formação de nível superior
  | 'cross_sell'    // Formação complementar
  | 'refresh'       // Atualização/reciclagem
  | 'certification' // Certificação avançada
  | 'community';    // Comunidade/mentoria

export type ActivationPriority = 'urgent' | 'high' | 'medium' | 'low';

// ============================================
// ACTIVATION OPPORTUNITY
// ============================================

export interface ActivationOpportunity {
  id: string;
  profile: SJProfile;
  type: 'progression' | 'reactivation' | 'lead_qualification';
  priority: ActivationPriority;
  score: number; // 0-100
  reason: string;
  suggestedAction: string;
  suggestedCourses?: SJCourse[];
  lastContact: string | null;
  daysSinceLastActivity: number;
  enrollmentsCompleted: number;
  totalRevenue: number;
  tags: string[];
}

// ============================================
// PROGRESSION CANDIDATE (Alumni pronto)
// ============================================

export interface ProgressionCandidate {
  profile: SJProfile;
  completedEnrollments: SJEnrollment[];
  lastCompletedAt: string;
  daysSinceCompletion: number;
  progressionType: ProgressionType;
  progressionScore: number; // 0-100
  suggestedNextCourses: SJCourse[];
  interests: string[];
  totalCoursesCompleted: number;
  estimatedValue: number;
  lastContactAt: string | null;
  preferredChannel: string;
}

// ============================================
// LEAD FUNNEL ITEM
// ============================================

export interface LeadFunnelItem {
  profile: SJProfile;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation';
  entryDate: string;
  daysInFunnel: number;
  source: string;
  interestedIn: string[];
  touchpointsCount: number;
  lastTouchpoint: string | null;
  qualificationScore: number;
  assignedTo: string | null;
  nextAction: string | null;
  nextActionDue: string | null;
}

// ============================================
// ACTIVATION ALERT
// ============================================

export interface ActivationAlert {
  id: string;
  type: 
    | 'ready_for_upsell'
    | 'cooling_period_ended'
    | 'dormant_alumni'
    | 'lead_stale'
    | 'follow_up_overdue'
    | 'high_value_inactive';
  priority: ActivationPriority;
  profile: SJProfile;
  message: string;
  suggestedAction: string;
  dueDate: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// GROWTH METRICS
// ============================================

export interface GrowthMetrics {
  // Alumni Base
  totalAlumni: number;
  alumniReadyForProgression: number;
  alumniDormant: number;
  alumniReactivatedThisMonth: number;
  averageCoursesPerAlumni: number;
  
  // Lead Funnel
  totalLeads: number;
  newLeadsThisWeek: number;
  leadsQualified: number;
  leadConversionRate: number;
  averageTimeToConvert: number; // days
  
  // Activation Performance
  activationRate: number;
  progressionRate: number;
  reactivationRate: number;
  averageLifetimeValue: number;
  
  // Pipeline Value
  pipelineValue: number;
  expectedRevenueThisMonth: number;
}

// ============================================
// CONFIGURATION
// ============================================

export const ACTIVATION_STATUS_CONFIG: Record<ActivationStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  ready_for_progression: {
    label: 'Pronto para Progressão',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'TrendingUp'
  },
  cooling_off: {
    label: 'Período de Reflexão',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'Clock'
  },
  engaged: {
    label: 'Engajado',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: 'Zap'
  },
  dormant: {
    label: 'Adormecido',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'Moon'
  },
  at_risk: {
    label: 'Em Risco',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: 'AlertTriangle'
  },
  new_lead: {
    label: 'Novo Lead',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'Sparkles'
  },
  nurturing: {
    label: 'Em Nutrição',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: 'Heart'
  }
};

export const PROGRESSION_TYPE_CONFIG: Record<ProgressionType, {
  label: string;
  description: string;
  icon: string;
}> = {
  upsell: {
    label: 'Upgrade',
    description: 'Formação de nível superior',
    icon: 'ArrowUpCircle'
  },
  cross_sell: {
    label: 'Complementar',
    description: 'Formação em área relacionada',
    icon: 'GitBranch'
  },
  refresh: {
    label: 'Atualização',
    description: 'Reciclagem de conhecimentos',
    icon: 'RefreshCw'
  },
  certification: {
    label: 'Certificação',
    description: 'Certificação avançada',
    icon: 'Award'
  },
  community: {
    label: 'Comunidade',
    description: 'Mentoria ou comunidade',
    icon: 'Users'
  }
};

export const PRIORITY_CONFIG: Record<ActivationPriority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  urgent: {
    label: 'Urgente',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  high: {
    label: 'Alta',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  medium: {
    label: 'Média',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  low: {
    label: 'Baixa',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50'
  }
};
