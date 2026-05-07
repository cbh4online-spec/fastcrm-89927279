
-- ========================================
-- FASE 1Y — IMPLEMENTATION PROJECT MANAGER
-- ========================================

-- 1. PROJECTS
CREATE TABLE public.implementation_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  internal_workspace_id uuid,
  onboarding_project_id uuid,
  proposal_id uuid,
  opportunity_id uuid,
  sales_request_id uuid,
  customer_workspace_id uuid,
  contact_id uuid,
  company_id uuid,
  plan_id uuid,
  package_id uuid,
  project_number text UNIQUE,
  title text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'implementation',
  status text NOT NULL DEFAULT 'planning',
  priority text NOT NULL DEFAULT 'medium',
  project_manager_id uuid,
  delivery_owner_id uuid,
  technical_owner_id uuid,
  customer_owner_name text,
  customer_owner_email text,
  start_date date,
  target_go_live_date date,
  actual_go_live_date date,
  completed_at timestamptz,
  estimated_hours numeric,
  used_hours numeric NOT NULL DEFAULT 0,
  budget_hours numeric,
  health_status text NOT NULL DEFAULT 'on_track',
  progress_percentage numeric NOT NULL DEFAULT 0,
  scope_summary text,
  success_criteria text,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_projects_workspace ON public.implementation_projects(workspace_id);
CREATE INDEX idx_impl_projects_status ON public.implementation_projects(status);
CREATE INDEX idx_impl_projects_onboarding ON public.implementation_projects(onboarding_project_id);

-- 2. PHASES
CREATE TABLE public.implementation_project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  workspace_id uuid,
  name text NOT NULL,
  description text,
  phase_type text,
  status text NOT NULL DEFAULT 'not_started',
  sort_order integer NOT NULL DEFAULT 100,
  start_date date,
  due_date date,
  completed_at timestamptz,
  owner_id uuid,
  progress_percentage numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_phases_project ON public.implementation_project_phases(project_id);

-- 3. TASKS
CREATE TABLE public.implementation_project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES public.implementation_project_phases(id) ON DELETE SET NULL,
  workspace_id uuid,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'internal',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid,
  customer_assigned boolean NOT NULL DEFAULT false,
  visible_to_customer boolean NOT NULL DEFAULT false,
  required boolean NOT NULL DEFAULT false,
  depends_on_task_ids uuid[] NOT NULL DEFAULT '{}',
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_hours numeric,
  used_hours numeric NOT NULL DEFAULT 0,
  completion_notes text,
  rejection_reason text,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_tasks_project ON public.implementation_project_tasks(project_id);
CREATE INDEX idx_impl_tasks_phase ON public.implementation_project_tasks(phase_id);
CREATE INDEX idx_impl_tasks_status ON public.implementation_project_tasks(status);

-- 4. BLOCKERS
CREATE TABLE public.implementation_blockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.implementation_project_tasks(id) ON DELETE SET NULL,
  phase_id uuid REFERENCES public.implementation_project_phases(id) ON DELETE SET NULL,
  workspace_id uuid,
  title text NOT NULL,
  description text,
  blocker_type text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  owner_id uuid,
  customer_visible boolean NOT NULL DEFAULT false,
  resolution_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_impl_blockers_project ON public.implementation_blockers(project_id);

-- 5. TIME ENTRIES
CREATE TABLE public.implementation_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.implementation_project_tasks(id) ON DELETE SET NULL,
  workspace_id uuid,
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  duration_minutes integer NOT NULL,
  billable boolean NOT NULL DEFAULT false,
  activity_type text,
  description text,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_time_project ON public.implementation_time_entries(project_id);
CREATE INDEX idx_impl_time_user ON public.implementation_time_entries(user_id);

-- 6. GO-LIVE CHECKLIST
CREATE TABLE public.implementation_golive_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  workspace_id uuid,
  status text NOT NULL DEFAULT 'draft',
  target_go_live_date date,
  approved_by uuid,
  approved_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_golive_project ON public.implementation_golive_checklists(project_id);

CREATE TABLE public.implementation_golive_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.implementation_golive_checklists(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  checked_by uuid,
  checked_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_golive_items_checklist ON public.implementation_golive_items(checklist_id);

-- 7. HANDOVER
CREATE TABLE public.implementation_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  workspace_id uuid,
  status text NOT NULL DEFAULT 'draft',
  handover_to_user_id uuid,
  handover_to_team_id uuid,
  customer_success_owner_id uuid,
  support_owner_id uuid,
  summary text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_handovers_project ON public.implementation_handovers(project_id);

CREATE TABLE public.implementation_handover_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id uuid NOT NULL REFERENCES public.implementation_handovers(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'pending',
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_handover_items_handover ON public.implementation_handover_items(handover_id);

-- 8. EVENTS
CREATE TABLE public.implementation_project_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  workspace_id uuid,
  event_type text NOT NULL,
  user_id uuid,
  contact_id uuid,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_events_project ON public.implementation_project_events(project_id);

-- 9. TEMPLATES
CREATE TABLE public.implementation_project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  package_id uuid,
  plan_id uuid,
  vertical text,
  project_type text NOT NULL DEFAULT 'implementation',
  estimated_hours numeric,
  default_phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_golive_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_handover_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. SCOPE CHANGES
CREATE TABLE public.implementation_scope_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.implementation_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reason text,
  impact_hours numeric,
  impact_cost numeric,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_scope_project ON public.implementation_scope_changes(project_id);

-- ENABLE RLS
ALTER TABLE public.implementation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_golive_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_golive_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_handover_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_scope_changes ENABLE ROW LEVEL SECURITY;

-- POLICIES — workspace_id based + super_admin
CREATE POLICY "members manage impl projects"
  ON public.implementation_projects FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "members manage impl phases"
  ON public.implementation_project_phases FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl tasks"
  ON public.implementation_project_tasks FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl blockers"
  ON public.implementation_blockers FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl time"
  ON public.implementation_time_entries FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl golive"
  ON public.implementation_golive_checklists FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl golive items"
  ON public.implementation_golive_items FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl handovers"
  ON public.implementation_handovers FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl handover items"
  ON public.implementation_handover_items FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members view impl events"
  ON public.implementation_project_events FOR SELECT
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "members insert impl events"
  ON public.implementation_project_events FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE POLICY "authenticated read impl templates"
  ON public.implementation_project_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "super admin manage impl templates"
  ON public.implementation_project_templates FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "members manage impl scope"
  ON public.implementation_scope_changes FOR ALL
  USING (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM public.implementation_projects WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_impl_projects_updated BEFORE UPDATE ON public.implementation_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_phases_updated BEFORE UPDATE ON public.implementation_project_phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_tasks_updated BEFORE UPDATE ON public.implementation_project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_blockers_updated BEFORE UPDATE ON public.implementation_blockers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_time_updated BEFORE UPDATE ON public.implementation_time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_golive_updated BEFORE UPDATE ON public.implementation_golive_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_golive_items_updated BEFORE UPDATE ON public.implementation_golive_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_handovers_updated BEFORE UPDATE ON public.implementation_handovers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_handover_items_updated BEFORE UPDATE ON public.implementation_handover_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_templates_updated BEFORE UPDATE ON public.implementation_project_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_impl_scope_updated BEFORE UPDATE ON public.implementation_scope_changes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
