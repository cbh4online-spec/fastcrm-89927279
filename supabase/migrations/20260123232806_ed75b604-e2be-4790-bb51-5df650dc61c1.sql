-- ============================================
-- STUDENT JOURNEY MODULE - REVISED SCHEMA
-- ============================================

-- Drop old tables if they exist (clean slate)
DROP TABLE IF EXISTS public.sj_audit_logs CASCADE;
DROP TABLE IF EXISTS public.sj_import_logs CASCADE;
DROP TABLE IF EXISTS public.sj_tasks CASCADE;
DROP TABLE IF EXISTS public.sj_touchpoints CASCADE;
DROP TABLE IF EXISTS public.sj_enrollments CASCADE;
DROP TABLE IF EXISTS public.sj_cohorts CASCADE;
DROP TABLE IF EXISTS public.sj_students CASCADE;
DROP TABLE IF EXISTS public.sj_permissions CASCADE;

-- ============================================
-- A) SJ_PROFILES - Perfil do aluno no módulo
-- ============================================
CREATE TABLE public.sj_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  external_ref TEXT,
  -- Matching fields
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  -- Lifecycle
  lifecycle_stage TEXT NOT NULL DEFAULT 'lead',
  -- Interests
  primary_interest TEXT,
  interests JSONB DEFAULT '[]',
  -- Communication
  preferred_channel TEXT DEFAULT 'email',
  -- Scoring
  student_score INTEGER DEFAULT 0,
  dropout_risk TEXT DEFAULT 'low',
  -- Activity tracking
  last_activity_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  -- Assignment
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Constraints
  CONSTRAINT sj_profiles_lifecycle_check CHECK (lifecycle_stage IN ('lead', 'prospect', 'enrolled', 'active', 'completed', 'inactive', 'churned')),
  CONSTRAINT sj_profiles_channel_check CHECK (preferred_channel IN ('email', 'whatsapp', 'phone', 'in-app')),
  CONSTRAINT sj_profiles_dropout_risk_check CHECK (dropout_risk IN ('low', 'medium', 'high')),
  CONSTRAINT sj_profiles_score_check CHECK (student_score >= 0 AND student_score <= 100),
  -- Prevent duplicates by contact
  CONSTRAINT sj_profiles_unique_contact UNIQUE (workspace_id, contact_id)
);

-- Indexes for sj_profiles
CREATE INDEX idx_sj_profiles_workspace ON public.sj_profiles(workspace_id);
CREATE INDEX idx_sj_profiles_contact ON public.sj_profiles(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_sj_profiles_email ON public.sj_profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_sj_profiles_phone ON public.sj_profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_sj_profiles_lifecycle ON public.sj_profiles(workspace_id, lifecycle_stage);
CREATE INDEX idx_sj_profiles_dropout_risk ON public.sj_profiles(workspace_id, dropout_risk);
CREATE INDEX idx_sj_profiles_follow_up ON public.sj_profiles(workspace_id, next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX idx_sj_profiles_owner ON public.sj_profiles(owner_user_id) WHERE owner_user_id IS NOT NULL;

-- ============================================
-- B) SJ_INTERESTS_TAXONOMY - Taxonomia de interesses
-- ============================================
CREATE TABLE public.sj_interests_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  synonyms JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Unique per workspace
  CONSTRAINT sj_interests_unique UNIQUE (workspace_id, category, topic)
);

CREATE INDEX idx_sj_interests_workspace ON public.sj_interests_taxonomy(workspace_id);
CREATE INDEX idx_sj_interests_active ON public.sj_interests_taxonomy(workspace_id, is_active) WHERE is_active = true;

-- ============================================
-- C) SJ_COURSES - Cursos/Formações
-- ============================================
CREATE TABLE public.sj_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Provider
  provider TEXT NOT NULL DEFAULT 'internal',
  provider_course_id TEXT,
  -- Type
  course_type TEXT NOT NULL DEFAULT 'online',
  -- Cohort settings
  cohort_enabled BOOLEAN DEFAULT false,
  -- Schedule
  start_date DATE,
  end_date DATE,
  -- Metadata
  tags JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_courses_provider_check CHECK (provider IN ('internal', 'kajabi', 'other')),
  CONSTRAINT sj_courses_type_check CHECK (course_type IN ('online', 'presencial', 'hibrido'))
);

CREATE INDEX idx_sj_courses_workspace ON public.sj_courses(workspace_id);
CREATE INDEX idx_sj_courses_active ON public.sj_courses(workspace_id, is_active) WHERE is_active = true;
CREATE INDEX idx_sj_courses_provider ON public.sj_courses(provider, provider_course_id) WHERE provider_course_id IS NOT NULL;

-- ============================================
-- D) SJ_COHORTS - Turmas
-- ============================================
CREATE TABLE public.sj_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.sj_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Schedule
  start_date DATE,
  end_date DATE,
  -- Capacity
  capacity INTEGER,
  -- Status
  status TEXT NOT NULL DEFAULT 'planned',
  -- Metadata
  settings JSONB DEFAULT '{}',
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_cohorts_status_check CHECK (status IN ('planned', 'open', 'running', 'finished'))
);

CREATE INDEX idx_sj_cohorts_workspace ON public.sj_cohorts(workspace_id);
CREATE INDEX idx_sj_cohorts_course ON public.sj_cohorts(course_id);
CREATE INDEX idx_sj_cohorts_status ON public.sj_cohorts(workspace_id, status);

-- ============================================
-- E) SJ_ENROLLMENTS - Inscrições
-- ============================================
CREATE TABLE public.sj_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.sj_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.sj_courses(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.sj_cohorts(id) ON DELETE SET NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'interested',
  -- Progress
  progress_percent INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  -- Dates
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Payment
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  -- Source
  source TEXT NOT NULL DEFAULT 'manual',
  -- Notes
  notes TEXT,
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Constraints
  CONSTRAINT sj_enrollments_status_check CHECK (status IN ('interested', 'invited', 'enrolled', 'active', 'completed', 'dropped')),
  CONSTRAINT sj_enrollments_payment_check CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'refunded')),
  CONSTRAINT sj_enrollments_source_check CHECK (source IN ('manual', 'import', 'checkout')),
  CONSTRAINT sj_enrollments_progress_check CHECK (progress_percent >= 0 AND progress_percent <= 100),
  -- Unique enrollment per profile/course
  CONSTRAINT sj_enrollments_unique UNIQUE (profile_id, course_id, cohort_id)
);

CREATE INDEX idx_sj_enrollments_workspace ON public.sj_enrollments(workspace_id);
CREATE INDEX idx_sj_enrollments_profile ON public.sj_enrollments(profile_id);
CREATE INDEX idx_sj_enrollments_course ON public.sj_enrollments(course_id);
CREATE INDEX idx_sj_enrollments_cohort ON public.sj_enrollments(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX idx_sj_enrollments_status ON public.sj_enrollments(workspace_id, status);

-- ============================================
-- F) SJ_TOUCHPOINTS - Histórico de acompanhamento
-- ============================================
CREATE TABLE public.sj_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.sj_profiles(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.sj_enrollments(id) ON DELETE SET NULL,
  -- Type
  touchpoint_type TEXT NOT NULL,
  -- Outcome
  outcome TEXT,
  -- Content
  message_preview TEXT,
  -- Timing
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Next action
  next_action TEXT,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_touchpoints_type_check CHECK (touchpoint_type IN ('call', 'whatsapp', 'email', 'meeting', 'note', 'task', 'automation', 'import')),
  CONSTRAINT sj_touchpoints_outcome_check CHECK (outcome IS NULL OR outcome IN ('no_answer', 'interested', 'needs_follow_up', 'enrolled', 'completed', 'churn_risk'))
);

CREATE INDEX idx_sj_touchpoints_workspace ON public.sj_touchpoints(workspace_id);
CREATE INDEX idx_sj_touchpoints_profile ON public.sj_touchpoints(profile_id);
CREATE INDEX idx_sj_touchpoints_enrollment ON public.sj_touchpoints(enrollment_id) WHERE enrollment_id IS NOT NULL;
CREATE INDEX idx_sj_touchpoints_occurred ON public.sj_touchpoints(workspace_id, occurred_at DESC);

-- ============================================
-- G) SJ_TASKS - Tarefas do módulo
-- ============================================
CREATE TABLE public.sj_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.sj_profiles(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.sj_enrollments(id) ON DELETE SET NULL,
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  -- Timing
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Status
  status TEXT NOT NULL DEFAULT 'open',
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_tasks_status_check CHECK (status IN ('open', 'done', 'canceled'))
);

CREATE INDEX idx_sj_tasks_workspace ON public.sj_tasks(workspace_id);
CREATE INDEX idx_sj_tasks_profile ON public.sj_tasks(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_sj_tasks_enrollment ON public.sj_tasks(enrollment_id) WHERE enrollment_id IS NOT NULL;
CREATE INDEX idx_sj_tasks_due ON public.sj_tasks(workspace_id, due_date) WHERE status = 'open';
CREATE INDEX idx_sj_tasks_assigned ON public.sj_tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_sj_tasks_status ON public.sj_tasks(workspace_id, status);

-- ============================================
-- H) SJ_IMPORT_JOBS - Controle de imports
-- ============================================
CREATE TABLE public.sj_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Source
  source TEXT NOT NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'queued',
  -- File
  file_name TEXT,
  file_url TEXT,
  -- Configuration
  mapping_config JSONB DEFAULT '{}',
  -- Results
  results_summary JSONB DEFAULT '{}',
  -- Counts
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  -- Errors detail
  errors JSONB DEFAULT '[]',
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_import_jobs_source_check CHECK (source IN ('csv', 'xlsx', 'kajabi_api')),
  CONSTRAINT sj_import_jobs_status_check CHECK (status IN ('queued', 'processing', 'done', 'failed'))
);

CREATE INDEX idx_sj_import_jobs_workspace ON public.sj_import_jobs(workspace_id);
CREATE INDEX idx_sj_import_jobs_status ON public.sj_import_jobs(workspace_id, status);

-- ============================================
-- SJ_PERMISSIONS - Permissões do módulo
-- ============================================
CREATE TABLE public.sj_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT sj_permissions_role_check CHECK (role IN ('admin', 'agent', 'viewer')),
  CONSTRAINT sj_permissions_unique UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_sj_permissions_workspace ON public.sj_permissions(workspace_id);
CREATE INDEX idx_sj_permissions_user ON public.sj_permissions(user_id);

-- ============================================
-- SJ_AUDIT_LOGS - Logs de auditoria
-- ============================================
CREATE TABLE public.sj_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_sj_audit_workspace ON public.sj_audit_logs(workspace_id);
CREATE INDEX idx_sj_audit_entity ON public.sj_audit_logs(entity_type, entity_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.sj_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_interests_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_audit_logs ENABLE ROW LEVEL SECURITY;

-- Update helper functions with search_path
CREATE OR REPLACE FUNCTION public.has_sj_module_access(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.workspace_modules wmod ON wmod.workspace_id = wm.workspace_id
    JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
    WHERE wm.workspace_id = p_workspace_id 
    AND wm.user_id = p_user_id
    AND mm.slug = 'student-journey'
    AND wmod.status IN ('active', 'trial')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_sj_permission(p_workspace_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_workspace_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.sj_permissions
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  SELECT role INTO v_workspace_role FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_workspace_role IN ('owner', 'admin') THEN
    RETURN 'admin';
  ELSIF v_workspace_role = 'agent' THEN
    RETURN 'agent';
  ELSE
    RETURN 'viewer';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- MATCHING FUNCTION - Link profiles to contacts
-- ============================================
CREATE OR REPLACE FUNCTION public.sj_match_profile_to_contact(p_profile_id UUID)
RETURNS UUID AS $$
DECLARE
  v_profile RECORD;
  v_contact_id UUID;
BEGIN
  -- Get profile data
  SELECT * INTO v_profile FROM public.sj_profiles WHERE id = p_profile_id;
  
  IF v_profile IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Already linked?
  IF v_profile.contact_id IS NOT NULL THEN
    RETURN v_profile.contact_id;
  END IF;
  
  -- Try match by email first (most reliable)
  IF v_profile.email IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM public.contacts
    WHERE workspace_id = v_profile.workspace_id 
    AND LOWER(email) = LOWER(v_profile.email)
    LIMIT 1;
    
    IF v_contact_id IS NOT NULL THEN
      UPDATE public.sj_profiles SET contact_id = v_contact_id, updated_at = now()
      WHERE id = p_profile_id;
      RETURN v_contact_id;
    END IF;
  END IF;
  
  -- Fallback: try match by phone
  IF v_profile.phone IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM public.contacts
    WHERE workspace_id = v_profile.workspace_id 
    AND phone = v_profile.phone
    LIMIT 1;
    
    IF v_contact_id IS NOT NULL THEN
      UPDATE public.sj_profiles SET contact_id = v_contact_id, updated_at = now()
      WHERE id = p_profile_id;
      RETURN v_contact_id;
    END IF;
  END IF;
  
  -- Fallback: try match by name (exact match)
  IF v_profile.full_name IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM public.contacts
    WHERE workspace_id = v_profile.workspace_id 
    AND LOWER(name) = LOWER(v_profile.full_name)
    LIMIT 1;
    
    IF v_contact_id IS NOT NULL THEN
      UPDATE public.sj_profiles SET contact_id = v_contact_id, updated_at = now()
      WHERE id = p_profile_id;
      RETURN v_contact_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- AUTO-MATCH TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.sj_profile_auto_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only try to match if no contact_id and we have matching fields
  IF NEW.contact_id IS NULL AND (NEW.email IS NOT NULL OR NEW.phone IS NOT NULL) THEN
    PERFORM public.sj_match_profile_to_contact(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sj_profiles_auto_match
  AFTER INSERT ON public.sj_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sj_profile_auto_match();

-- ============================================
-- RLS POLICIES FOR ALL TABLES
-- ============================================

-- Profiles
CREATE POLICY "sj_profiles_select" ON public.sj_profiles FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_profiles_insert" ON public.sj_profiles FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_profiles_update" ON public.sj_profiles FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_profiles_delete" ON public.sj_profiles FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Interests Taxonomy
CREATE POLICY "sj_interests_select" ON public.sj_interests_taxonomy FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_interests_insert" ON public.sj_interests_taxonomy FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');
CREATE POLICY "sj_interests_update" ON public.sj_interests_taxonomy FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');
CREATE POLICY "sj_interests_delete" ON public.sj_interests_taxonomy FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Courses
CREATE POLICY "sj_courses_select" ON public.sj_courses FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_courses_insert" ON public.sj_courses FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_courses_update" ON public.sj_courses FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_courses_delete" ON public.sj_courses FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Cohorts
CREATE POLICY "sj_cohorts_select" ON public.sj_cohorts FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_cohorts_insert" ON public.sj_cohorts FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_cohorts_update" ON public.sj_cohorts FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_cohorts_delete" ON public.sj_cohorts FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Enrollments
CREATE POLICY "sj_enrollments_select" ON public.sj_enrollments FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_enrollments_insert" ON public.sj_enrollments FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_enrollments_update" ON public.sj_enrollments FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_enrollments_delete" ON public.sj_enrollments FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Touchpoints
CREATE POLICY "sj_touchpoints_select" ON public.sj_touchpoints FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_touchpoints_insert" ON public.sj_touchpoints FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_touchpoints_update" ON public.sj_touchpoints FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_touchpoints_delete" ON public.sj_touchpoints FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Tasks
CREATE POLICY "sj_tasks_select" ON public.sj_tasks FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_tasks_insert" ON public.sj_tasks FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_tasks_update" ON public.sj_tasks FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent'));
CREATE POLICY "sj_tasks_delete" ON public.sj_tasks FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Import Jobs
CREATE POLICY "sj_import_jobs_select" ON public.sj_import_jobs FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_import_jobs_insert" ON public.sj_import_jobs FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');
CREATE POLICY "sj_import_jobs_update" ON public.sj_import_jobs FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Permissions
CREATE POLICY "sj_permissions_select" ON public.sj_permissions FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_permissions_insert" ON public.sj_permissions FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');
CREATE POLICY "sj_permissions_update" ON public.sj_permissions FOR UPDATE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');
CREATE POLICY "sj_permissions_delete" ON public.sj_permissions FOR DELETE
  USING (has_sj_module_access(workspace_id, auth.uid()) AND get_sj_permission(workspace_id, auth.uid()) = 'admin');

-- Audit Logs
CREATE POLICY "sj_audit_logs_select" ON public.sj_audit_logs FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));
CREATE POLICY "sj_audit_logs_insert" ON public.sj_audit_logs FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()));

-- ============================================
-- AUDIT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.sj_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sj_audit_logs (workspace_id, action_type, entity_type, entity_id, user_id, new_data)
    VALUES (NEW.workspace_id, 'create', TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.sj_audit_logs (workspace_id, action_type, entity_type, entity_id, user_id, old_data, new_data)
    VALUES (NEW.workspace_id, 'update', TG_TABLE_NAME, NEW.id, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.sj_audit_logs (workspace_id, action_type, entity_type, entity_id, user_id, old_data)
    VALUES (OLD.workspace_id, 'delete', TG_TABLE_NAME, OLD.id, auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply audit triggers to main tables
CREATE TRIGGER sj_profiles_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();
CREATE TRIGGER sj_courses_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_courses
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();
CREATE TRIGGER sj_cohorts_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();
CREATE TRIGGER sj_enrollments_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER sj_profiles_updated_at BEFORE UPDATE ON public.sj_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sj_interests_updated_at BEFORE UPDATE ON public.sj_interests_taxonomy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sj_courses_updated_at BEFORE UPDATE ON public.sj_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sj_cohorts_updated_at BEFORE UPDATE ON public.sj_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sj_enrollments_updated_at BEFORE UPDATE ON public.sj_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sj_tasks_updated_at BEFORE UPDATE ON public.sj_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();