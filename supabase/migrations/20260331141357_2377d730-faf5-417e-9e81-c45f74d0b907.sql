
-- ══════════════════════════════════════════════════════════════
-- HR Onboarding Module — 5 new tables
-- ══════════════════════════════════════════════════════════════

-- 1. Onboarding Templates
CREATE TABLE public.hr_onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_onboarding_templates_workspace ON public.hr_onboarding_templates(workspace_id);

-- 2. Onboarding Task Templates
CREATE TYPE public.hr_onboarding_task_category AS ENUM ('hr', 'it', 'manager', 'team', 'self');

CREATE TABLE public.hr_onboarding_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.hr_onboarding_templates(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.hr_onboarding_task_category NOT NULL DEFAULT 'hr',
  assigned_to_role TEXT,
  due_days INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_onboarding_task_templates_template ON public.hr_onboarding_task_templates(template_id);

-- 3. Onboarding Instances
CREATE TYPE public.hr_onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.hr_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.hr_onboarding_templates(id) ON DELETE SET NULL,
  buddy_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  status public.hr_onboarding_status NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  completed_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_onboardings_workspace ON public.hr_onboardings(workspace_id);
CREATE INDEX idx_hr_onboardings_employee ON public.hr_onboardings(employee_id);
CREATE INDEX idx_hr_onboardings_status ON public.hr_onboardings(workspace_id, status);

-- 4. Onboarding Tasks (concrete instances)
CREATE TABLE public.hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.hr_onboardings(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category public.hr_onboarding_task_category NOT NULL DEFAULT 'hr',
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_onboarding_tasks_onboarding ON public.hr_onboarding_tasks(onboarding_id);
CREATE INDEX idx_hr_onboarding_tasks_assigned ON public.hr_onboarding_tasks(assigned_to);

-- 5. Onboarding Feedback (30-60-90 day checkpoints)
CREATE TYPE public.hr_onboarding_feedback_type AS ENUM ('30_days', '60_days', '90_days');

CREATE TABLE public.hr_onboarding_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.hr_onboardings(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feedback_type public.hr_onboarding_feedback_type NOT NULL,
  due_date DATE NOT NULL,
  employee_rating INTEGER,
  employee_comments TEXT,
  manager_rating INTEGER,
  manager_comments TEXT,
  buddy_rating INTEGER,
  buddy_comments TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(onboarding_id, feedback_type)
);

CREATE INDEX idx_hr_onboarding_feedback_onboarding ON public.hr_onboarding_feedback(onboarding_id);

-- ══════════════════════════════════════════════════════════════
-- Triggers: updated_at
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_hr_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hr_onboarding_templates_updated_at
  BEFORE UPDATE ON public.hr_onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_hr_onboarding_updated_at();

CREATE TRIGGER trg_hr_onboarding_task_templates_updated_at
  BEFORE UPDATE ON public.hr_onboarding_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_hr_onboarding_updated_at();

CREATE TRIGGER trg_hr_onboardings_updated_at
  BEFORE UPDATE ON public.hr_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_hr_onboarding_updated_at();

CREATE TRIGGER trg_hr_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.hr_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_hr_onboarding_updated_at();

CREATE TRIGGER trg_hr_onboarding_feedback_updated_at
  BEFORE UPDATE ON public.hr_onboarding_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_hr_onboarding_updated_at();

-- ══════════════════════════════════════════════════════════════
-- Trigger: auto-calculate onboarding progress
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_completed = true)
  INTO total_tasks, completed_tasks
  FROM public.hr_onboarding_tasks
  WHERE onboarding_id = COALESCE(NEW.onboarding_id, OLD.onboarding_id);

  IF total_tasks > 0 THEN
    new_progress := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    new_progress := 0;
  END IF;

  UPDATE public.hr_onboardings
  SET progress = new_progress,
      status = CASE
        WHEN new_progress = 100 THEN 'completed'::public.hr_onboarding_status
        WHEN new_progress > 0 THEN 'in_progress'::public.hr_onboarding_status
        ELSE status
      END,
      completed_at = CASE
        WHEN new_progress = 100 THEN now()
        ELSE NULL
      END
  WHERE id = COALESCE(NEW.onboarding_id, OLD.onboarding_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_calculate_onboarding_progress
  AFTER INSERT OR UPDATE OF is_completed OR DELETE ON public.hr_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.calculate_onboarding_progress();

-- ══════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.hr_onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_feedback ENABLE ROW LEVEL SECURITY;

-- Templates: workspace members can read, only HR/admin can write
CREATE POLICY "Members can view onboarding templates"
  ON public.hr_onboarding_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_templates.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage onboarding templates"
  ON public.hr_onboarding_templates FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_templates.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_templates.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ));

-- Task templates: same as templates
CREATE POLICY "Members can view task templates"
  ON public.hr_onboarding_task_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_task_templates.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage task templates"
  ON public.hr_onboarding_task_templates FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_task_templates.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_task_templates.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ));

-- Onboardings: workspace members can view
CREATE POLICY "Members can view onboardings"
  ON public.hr_onboardings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboardings.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage onboardings"
  ON public.hr_onboardings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboardings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboardings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ));

-- Tasks: workspace members can view, assigned user or admin can update
CREATE POLICY "Members can view onboarding tasks"
  ON public.hr_onboarding_tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_tasks.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Assigned or admin can manage onboarding tasks"
  ON public.hr_onboarding_tasks FOR UPDATE TO authenticated
  USING (
    hr_onboarding_tasks.assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_onboarding_tasks.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admin can insert onboarding tasks"
  ON public.hr_onboarding_tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_tasks.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  ));

-- Feedback: workspace members can view, participants can update
CREATE POLICY "Members can view onboarding feedback"
  ON public.hr_onboarding_feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_feedback.workspace_id
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Members can manage onboarding feedback"
  ON public.hr_onboarding_feedback FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_feedback.workspace_id
    AND wm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = hr_onboarding_feedback.workspace_id
    AND wm.user_id = auth.uid()
  ));
