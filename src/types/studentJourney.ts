// Student Journey Module Types

export type StudentStage = 'lead' | 'inscrito' | 'ativo' | 'concluido' | 'inativo' | 'churn';

export type CohortStatus = 'planned' | 'enrolling' | 'active' | 'completed' | 'cancelled';

export type EnrollmentStatus = 'pending' | 'active' | 'paused' | 'completed' | 'dropped' | 'cancelled';

export type TouchpointType = 'call' | 'email' | 'meeting' | 'class' | 'support' | 'feedback' | 'assessment' | 'milestone' | 'other';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type SJPermissionRole = 'admin' | 'agent' | 'viewer';

// Stage configuration
export const STUDENT_STAGE_CONFIG: Record<StudentStage, {
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
  inscrito: {
    label: 'Inscrito',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'ClipboardCheck'
  },
  ativo: {
    label: 'Ativo',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: 'Play'
  },
  concluido: {
    label: 'Concluído',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'GraduationCap'
  },
  inativo: {
    label: 'Inativo',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    icon: 'Pause'
  },
  churn: {
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
  planned: {
    label: 'Planeada',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  enrolling: {
    label: 'Inscrições Abertas',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  active: {
    label: 'Em Curso',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  completed: {
    label: 'Concluída',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  }
};

export const TOUCHPOINT_TYPE_CONFIG: Record<TouchpointType, {
  label: string;
  icon: string;
}> = {
  call: { label: 'Chamada', icon: 'Phone' },
  email: { label: 'Email', icon: 'Mail' },
  meeting: { label: 'Reunião', icon: 'Video' },
  class: { label: 'Aula', icon: 'BookOpen' },
  support: { label: 'Suporte', icon: 'HelpCircle' },
  feedback: { label: 'Feedback', icon: 'MessageSquare' },
  assessment: { label: 'Avaliação', icon: 'FileCheck' },
  milestone: { label: 'Marco', icon: 'Flag' },
  other: { label: 'Outro', icon: 'MoreHorizontal' }
};

// Entity interfaces
export interface SJStudent {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  stage: StudentStage;
  stage_changed_at: string;
  interests: string[];
  source: string | null;
  source_detail: string | null;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  ai_insight: string | null;
  ai_next_action: string | null;
  ai_analyzed_at: string | null;
  churn_risk: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  contact?: {
    id: string;
    name: string;
    email: string | null;
  };
  enrollments_count?: number;
  active_enrollments?: number;
}

export interface SJCohort {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  course_name: string | null;
  course_category: string | null;
  start_date: string | null;
  end_date: string | null;
  max_students: number | null;
  status: CohortStatus;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Computed
  students_count?: number;
  active_students?: number;
}

export interface SJEnrollment {
  id: string;
  workspace_id: string;
  student_id: string;
  cohort_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  modules_completed: number;
  modules_total: number;
  last_activity_at: string | null;
  completed_at: string | null;
  certificate_issued: boolean;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  student?: SJStudent;
  cohort?: SJCohort;
}

export interface SJTouchpoint {
  id: string;
  workspace_id: string;
  student_id: string;
  touchpoint_type: TouchpointType;
  title: string;
  description: string | null;
  occurred_at: string;
  channel: string | null;
  outcome: string | null;
  sentiment: string | null;
  cohort_id: string | null;
  task_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface SJTask {
  id: string;
  workspace_id: string;
  student_id: string | null;
  cohort_id: string | null;
  title: string;
  description: string | null;
  task_type: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined
  student?: SJStudent;
  cohort?: SJCohort;
}

export interface SJImportLog {
  id: string;
  workspace_id: string;
  import_type: string;
  file_name: string | null;
  source: string | null;
  total_rows: number;
  success_count: number;
  error_count: number;
  skip_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: Array<{ row: number; error: string }>;
  started_at: string | null;
  completed_at: string | null;
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

export interface SJPermission {
  id: string;
  workspace_id: string;
  user_id: string;
  role: SJPermissionRole;
  created_at: string;
  created_by: string | null;
}

// Dashboard metrics
export interface SJDashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  churnRate: number;
  activeCohorts: number;
  averageProgress: number;
  stageBreakdown: Record<StudentStage, number>;
}

// Form types
export interface CreateStudentData {
  name: string;
  email?: string;
  phone?: string;
  stage?: StudentStage;
  interests?: string[];
  source?: string;
  source_detail?: string;
  notes?: string;
  tags?: string[];
  contact_id?: string;
}

export interface CreateCohortData {
  name: string;
  description?: string;
  course_name?: string;
  course_category?: string;
  start_date?: string;
  end_date?: string;
  max_students?: number;
  status?: CohortStatus;
}

export interface CreateEnrollmentData {
  student_id: string;
  cohort_id: string;
  status?: EnrollmentStatus;
  modules_total?: number;
}

export interface CreateTouchpointData {
  student_id: string;
  touchpoint_type: TouchpointType;
  title: string;
  description?: string;
  occurred_at?: string;
  channel?: string;
  outcome?: string;
  sentiment?: string;
  cohort_id?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  student_id?: string;
  cohort_id?: string;
  task_type?: string;
  priority?: TaskPriority;
  assigned_to?: string;
  due_date?: string;
}
