-- ============================================
-- STUDENT JOURNEY MODULE - DATABASE STRUCTURE
-- ============================================

-- 1. Register module in marketplace
INSERT INTO public.marketplace_modules (
  id, slug, name, tagline, description, category, 
  is_featured, permissions, version, status, publisher
) VALUES (
  gen_random_uuid(),
  'student-journey',
  'Student Journey',
  'Gestão completa da jornada de formação',
  'Módulo para controlar a jornada de alunos: lead → inscrito → ativo → concluído. Mapeie interesses, acompanhe progresso, gerencie coortes e touchpoints. Inclui Assistente IA Student Journey Copilot.',
  'education',
  true,
  '["student_journey_admin", "student_journey_agent", "student_journey_viewer"]'::jsonb,
  '1.0.0',
  'published',
  'FastCRM'
) ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- 2. Student Journey Stages Enum
DO $$ BEGIN
  CREATE TYPE student_journey_stage AS ENUM (
    'lead', 'inscrito', 'ativo', 'concluido', 'inativo', 'churn'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Students table (main entity, linked to contacts when possible)
CREATE TABLE IF NOT EXISTS public.sj_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  -- Student data (used when no contact linked)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  -- Journey state
  stage TEXT NOT NULL DEFAULT 'lead',
  stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Interests/categories
  interests TEXT[] DEFAULT '{}',
  -- Source tracking
  source TEXT,
  source_detail TEXT,
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  -- AI fields
  ai_insight TEXT,
  ai_next_action TEXT,
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  churn_risk TEXT DEFAULT 'baixo',
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_students_stage_check CHECK (stage IN ('lead', 'inscrito', 'ativo', 'concluido', 'inativo', 'churn'))
);

-- 4. Cohorts/Turmas table
CREATE TABLE IF NOT EXISTS public.sj_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Course/Program info
  course_name TEXT,
  course_category TEXT,
  -- Schedule
  start_date DATE,
  end_date DATE,
  -- Capacity
  max_students INTEGER,
  -- Status
  status TEXT NOT NULL DEFAULT 'planned',
  -- Metadata
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_cohorts_status_check CHECK (status IN ('planned', 'enrolling', 'active', 'completed', 'cancelled'))
);

-- 5. Student-Cohort enrollments
CREATE TABLE IF NOT EXISTS public.sj_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.sj_students(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.sj_cohorts(id) ON DELETE CASCADE,
  -- Enrollment details
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  -- Progress tracking
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  modules_completed INTEGER DEFAULT 0,
  modules_total INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Constraints
  CONSTRAINT sj_enrollments_status_check CHECK (status IN ('pending', 'active', 'paused', 'completed', 'dropped', 'cancelled')),
  CONSTRAINT sj_enrollments_unique UNIQUE (student_id, cohort_id)
);

-- 6. Touchpoints/Interactions
CREATE TABLE IF NOT EXISTS public.sj_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.sj_students(id) ON DELETE CASCADE,
  -- Touchpoint details
  touchpoint_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Timing
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Channel
  channel TEXT,
  -- Outcome
  outcome TEXT,
  sentiment TEXT,
  -- Linked entities
  cohort_id UUID REFERENCES public.sj_cohorts(id) ON DELETE SET NULL,
  task_id UUID,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_touchpoints_type_check CHECK (touchpoint_type IN ('call', 'email', 'meeting', 'class', 'support', 'feedback', 'assessment', 'milestone', 'other'))
);

-- 7. Module-specific tasks
CREATE TABLE IF NOT EXISTS public.sj_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.sj_students(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.sj_cohorts(id) ON DELETE CASCADE,
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'follow_up',
  priority TEXT DEFAULT 'medium',
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  -- Timing
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT sj_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- 8. Import history for the module
CREATE TABLE IF NOT EXISTS public.sj_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Import details
  import_type TEXT NOT NULL,
  file_name TEXT,
  source TEXT,
  -- Stats
  total_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Errors
  errors JSONB DEFAULT '[]',
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_import_logs_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- 9. Module audit log
CREATE TABLE IF NOT EXISTS public.sj_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Action details
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  -- Actor
  user_id UUID REFERENCES auth.users(id),
  -- Data
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}',
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Module permissions table
CREATE TABLE IF NOT EXISTS public.sj_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  -- Constraints
  CONSTRAINT sj_permissions_role_check CHECK (role IN ('admin', 'agent', 'viewer')),
  CONSTRAINT sj_permissions_unique UNIQUE (workspace_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sj_students_workspace ON public.sj_students(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_students_contact ON public.sj_students(contact_id);
CREATE INDEX IF NOT EXISTS idx_sj_students_stage ON public.sj_students(stage);
CREATE INDEX IF NOT EXISTS idx_sj_students_email ON public.sj_students(email);
CREATE INDEX IF NOT EXISTS idx_sj_cohorts_workspace ON public.sj_cohorts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_cohorts_status ON public.sj_cohorts(status);
CREATE INDEX IF NOT EXISTS idx_sj_enrollments_workspace ON public.sj_enrollments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_enrollments_student ON public.sj_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sj_enrollments_cohort ON public.sj_enrollments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_sj_touchpoints_workspace ON public.sj_touchpoints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_touchpoints_student ON public.sj_touchpoints(student_id);
CREATE INDEX IF NOT EXISTS idx_sj_tasks_workspace ON public.sj_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_tasks_student ON public.sj_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_sj_tasks_assigned ON public.sj_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sj_audit_workspace ON public.sj_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_permissions_workspace ON public.sj_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sj_permissions_user ON public.sj_permissions(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.sj_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sj_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check module access
CREATE OR REPLACE FUNCTION public.has_sj_module_access(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is workspace member AND module is installed
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check module permission level
CREATE OR REPLACE FUNCTION public.get_sj_permission(p_workspace_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_workspace_role TEXT;
BEGIN
  -- First check module-specific permission
  SELECT role INTO v_role FROM public.sj_permissions
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  -- Fallback to workspace role
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Students policies
CREATE POLICY "sj_students_select" ON public.sj_students FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_students_insert" ON public.sj_students FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_students_update" ON public.sj_students FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_students_delete" ON public.sj_students FOR DELETE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- Cohorts policies
CREATE POLICY "sj_cohorts_select" ON public.sj_cohorts FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_cohorts_insert" ON public.sj_cohorts FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_cohorts_update" ON public.sj_cohorts FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_cohorts_delete" ON public.sj_cohorts FOR DELETE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- Enrollments policies
CREATE POLICY "sj_enrollments_select" ON public.sj_enrollments FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_enrollments_insert" ON public.sj_enrollments FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_enrollments_update" ON public.sj_enrollments FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_enrollments_delete" ON public.sj_enrollments FOR DELETE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- Touchpoints policies
CREATE POLICY "sj_touchpoints_select" ON public.sj_touchpoints FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_touchpoints_insert" ON public.sj_touchpoints FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_touchpoints_update" ON public.sj_touchpoints FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_touchpoints_delete" ON public.sj_touchpoints FOR DELETE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- Tasks policies
CREATE POLICY "sj_tasks_select" ON public.sj_tasks FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_tasks_insert" ON public.sj_tasks FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_tasks_update" ON public.sj_tasks FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) IN ('admin', 'agent')
  );

CREATE POLICY "sj_tasks_delete" ON public.sj_tasks FOR DELETE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- Import logs policies (admin only for writes)
CREATE POLICY "sj_import_logs_select" ON public.sj_import_logs FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_import_logs_insert" ON public.sj_import_logs FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

CREATE POLICY "sj_import_logs_update" ON public.sj_import_logs FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- Audit logs policies (read only for users, insert via triggers)
CREATE POLICY "sj_audit_logs_select" ON public.sj_audit_logs FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_audit_logs_insert" ON public.sj_audit_logs FOR INSERT
  WITH CHECK (has_sj_module_access(workspace_id, auth.uid()));

-- Permissions table policies (admin only)
CREATE POLICY "sj_permissions_select" ON public.sj_permissions FOR SELECT
  USING (has_sj_module_access(workspace_id, auth.uid()));

CREATE POLICY "sj_permissions_insert" ON public.sj_permissions FOR INSERT
  WITH CHECK (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

CREATE POLICY "sj_permissions_update" ON public.sj_permissions FOR UPDATE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

CREATE POLICY "sj_permissions_delete" ON public.sj_permissions FOR DELETE
  USING (
    has_sj_module_access(workspace_id, auth.uid()) 
    AND get_sj_permission(workspace_id, auth.uid()) = 'admin'
  );

-- ============================================
-- TRIGGERS FOR AUDIT LOGGING
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER sj_students_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_students
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();

CREATE TRIGGER sj_cohorts_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();

CREATE TRIGGER sj_enrollments_audit AFTER INSERT OR UPDATE OR DELETE ON public.sj_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.sj_audit_trigger();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER sj_students_updated_at BEFORE UPDATE ON public.sj_students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sj_cohorts_updated_at BEFORE UPDATE ON public.sj_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sj_enrollments_updated_at BEFORE UPDATE ON public.sj_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sj_tasks_updated_at BEFORE UPDATE ON public.sj_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();