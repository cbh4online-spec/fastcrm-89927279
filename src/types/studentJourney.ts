// Student Journey Module Types - Revised Schema

// ============================================
// LIFECYCLE & STATUS ENUMS
// ============================================

export type LifecycleStage = 'lead' | 'prospect' | 'enrolled' | 'active' | 'completed' | 'inactive' | 'churned';

export type DropoutRisk = 'low' | 'medium' | 'high';

export type PreferredChannel = 'email' | 'whatsapp' | 'phone' | 'in-app';

export type CourseProvider = 'internal' | 'kajabi' | 'other';

export type CourseType = 'online' | 'presencial' | 'hibrido';

export type CohortStatus = 'planned' | 'open' | 'running' | 'finished';

export type EnrollmentStatus = 'interested' | 'invited' | 'enrolled' | 'active' | 'completed' | 'dropped';

export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'refunded';

export type EnrollmentSource = 'manual' | 'import' | 'checkout';

export type TouchpointType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note' | 'task' | 'automation' | 'import';

export type TouchpointOutcome = 'no_answer' | 'interested' | 'needs_follow_up' | 'enrolled' | 'completed' | 'churn_risk';

export type TaskStatus = 'open' | 'done' | 'canceled';

export type ImportSource = 'csv' | 'xlsx' | 'kajabi_api';

export type ImportStatus = 'queued' | 'processing' | 'done' | 'failed';

export type SJPermissionRole = 'admin' | 'agent' | 'viewer';

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

export const LIFECYCLE_STAGE_CONFIG: Record<LifecycleStage, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  lead: {
    label: 'Lead',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'UserPlus'
  },
  prospect: {
    label: 'Prospect',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: 'Target'
  },
  enrolled: {
    label: 'Inscrito',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'ClipboardCheck'
  },
  active: {
    label: 'Ativo',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: 'Play'
  },
  completed: {
    label: 'Concluído',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'GraduationCap'
  },
  inactive: {
    label: 'Inativo',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    icon: 'Pause'
  },
  churned: {
    label: 'Churn',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: 'UserX'
  }
};

export const COHORT_STATUS_CONFIG: Record<CohortStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  planned: { label: 'Planeada', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  open: { label: 'Aberta', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  running: { label: 'Em Curso', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  finished: { label: 'Concluída', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800/50' }
};

export const ENROLLMENT_STATUS_CONFIG: Record<EnrollmentStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  interested: { label: 'Interessado', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  invited: { label: 'Convidado', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  enrolled: { label: 'Inscrito', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  active: { label: 'Ativo', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  completed: { label: 'Concluído', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  dropped: { label: 'Desistiu', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

export const TOUCHPOINT_TYPE_CONFIG: Record<TouchpointType, { label: string; icon: string }> = {
  call: { label: 'Chamada', icon: 'Phone' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle' },
  email: { label: 'Email', icon: 'Mail' },
  meeting: { label: 'Reunião', icon: 'Video' },
  note: { label: 'Nota', icon: 'StickyNote' },
  task: { label: 'Tarefa', icon: 'CheckSquare' },
  automation: { label: 'Automação', icon: 'Zap' },
  import: { label: 'Importação', icon: 'Upload' }
};

export const DROPOUT_RISK_CONFIG: Record<DropoutRisk, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Baixo', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  medium: { label: 'Médio', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  high: { label: 'Alto', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

// ============================================
// ENTITY INTERFACES
// ============================================

export interface SJProfile {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  external_ref: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  lifecycle_stage: LifecycleStage;
  primary_interest: string | null;
  interests: string[];
  preferred_channel: PreferredChannel;
  student_score: number;
  dropout_risk: DropoutRisk;
  last_activity_at: string | null;
  next_follow_up_at: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: { id: string; name: string; email: string | null };
  enrollments_count?: number;
}

export interface SJInterestTaxonomy {
  id: string;
  workspace_id: string;
  category: string;
  topic: string;
  synonyms: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SJCourse {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  provider: CourseProvider;
  provider_course_id: string | null;
  course_type: CourseType;
  cohort_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Computed
  cohorts_count?: number;
  enrollments_count?: number;
}

export interface SJCohort {
  id: string;
  workspace_id: string;
  course_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  status: CohortStatus;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  course?: SJCourse;
  enrollments_count?: number;
}

export interface SJEnrollment {
  id: string;
  workspace_id: string;
  profile_id: string;
  course_id: string;
  cohort_id: string | null;
  status: EnrollmentStatus;
  progress_percent: number;
  last_activity_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  payment_status: PaymentStatus;
  source: EnrollmentSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: SJProfile;
  course?: SJCourse;
  cohort?: SJCohort;
}

export interface SJTouchpoint {
  id: string;
  workspace_id: string;
  profile_id: string;
  enrollment_id: string | null;
  touchpoint_type: TouchpointType;
  outcome: TouchpointOutcome | null;
  message_preview: string | null;
  occurred_at: string;
  next_action: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface SJTask {
  id: string;
  workspace_id: string;
  profile_id: string | null;
  enrollment_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  profile?: SJProfile;
}

export interface SJImportJob {
  id: string;
  workspace_id: string;
  source: ImportSource;
  status: ImportStatus;
  file_name: string | null;
  file_url: string | null;
  mapping_config: Record<string, unknown>;
  results_summary: Record<string, unknown>;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
  errors: Array<{ row: number; error: string }>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface SJPermission {
  id: string;
  workspace_id: string;
  user_id: string;
  role: SJPermissionRole;
  created_at: string;
  created_by: string | null;
}

export interface SJAuditLog {
  id: string;
  workspace_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================
// DASHBOARD METRICS
// ============================================

export interface SJDashboardMetrics {
  totalProfiles: number;
  activeProfiles: number;
  completedProfiles: number;
  churnedProfiles: number;
  churnRate: number;
  activeCourses: number;
  runningCohorts: number;
  averageProgress: number;
  highRiskCount: number;
  lifecycleBreakdown: Record<LifecycleStage, number>;
}

// ============================================
// FORM TYPES
// ============================================

export interface CreateProfileData {
  full_name: string;
  email?: string;
  phone?: string;
  lifecycle_stage?: LifecycleStage;
  primary_interest?: string;
  interests?: string[];
  preferred_channel?: PreferredChannel;
  contact_id?: string;
  external_ref?: string;
  owner_user_id?: string;
}

export interface CreateCourseData {
  name: string;
  description?: string;
  provider?: CourseProvider;
  provider_course_id?: string;
  course_type?: CourseType;
  cohort_enabled?: boolean;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  is_active?: boolean;
}

export interface CreateCohortData {
  course_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  capacity?: number;
  status?: CohortStatus;
}

export interface CreateEnrollmentData {
  profile_id: string;
  course_id: string;
  cohort_id?: string;
  status?: EnrollmentStatus;
  payment_status?: PaymentStatus;
  source?: EnrollmentSource;
  notes?: string;
}

export interface CreateTouchpointData {
  profile_id: string;
  enrollment_id?: string;
  touchpoint_type: TouchpointType;
  outcome?: TouchpointOutcome;
  message_preview?: string;
  occurred_at?: string;
  next_action?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  profile_id?: string;
  enrollment_id?: string;
  due_date?: string;
  assigned_to?: string;
}
