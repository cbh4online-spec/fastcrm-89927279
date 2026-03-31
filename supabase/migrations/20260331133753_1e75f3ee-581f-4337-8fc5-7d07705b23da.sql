
-- ============================================================
-- Performance & OKRs: 4 new tables
-- ============================================================

-- 1. hr_okrs
CREATE TABLE public.hr_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  parent_okr_id UUID REFERENCES public.hr_okrs(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'individual',
  objective TEXT NOT NULL,
  description TEXT,
  period TEXT NOT NULL DEFAULT 'Q1',
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  progress DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. hr_key_results
CREATE TABLE public.hr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES public.hr_okrs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'number',
  start_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  target_value DECIMAL(12,2) NOT NULL DEFAULT 100,
  current_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT '%',
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  progress DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN target_value = start_value THEN 0
      ELSE LEAST(100, GREATEST(0, ((current_value - start_value) / (target_value - start_value)) * 100))
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. hr_feedback
CREATE TABLE public.hr_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  to_employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL DEFAULT 'praise',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. hr_checkins
CREATE TABLE public.hr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  agenda TEXT,
  notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  mood_rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Validation triggers (instead of CHECK constraints)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_hr_okr_dates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hr_okr_dates
  BEFORE INSERT OR UPDATE ON public.hr_okrs
  FOR EACH ROW EXECUTE FUNCTION public.validate_hr_okr_dates();

CREATE OR REPLACE FUNCTION public.validate_hr_checkin_mood()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mood_rating IS NOT NULL AND (NEW.mood_rating < 1 OR NEW.mood_rating > 5) THEN
    RAISE EXCEPTION 'mood_rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_hr_checkin_mood
  BEFORE INSERT OR UPDATE ON public.hr_checkins
  FOR EACH ROW EXECUTE FUNCTION public.validate_hr_checkin_mood();

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE TRIGGER set_hr_okrs_updated_at
  BEFORE UPDATE ON public.hr_okrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_key_results_updated_at
  BEFORE UPDATE ON public.hr_key_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_checkins_updated_at
  BEFORE UPDATE ON public.hr_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_hr_okrs_workspace ON public.hr_okrs(workspace_id);
CREATE INDEX idx_hr_okrs_employee ON public.hr_okrs(employee_id);
CREATE INDEX idx_hr_okrs_period_year ON public.hr_okrs(period, year);
CREATE INDEX idx_hr_okrs_status ON public.hr_okrs(status);
CREATE INDEX idx_hr_okrs_parent ON public.hr_okrs(parent_okr_id);

CREATE INDEX idx_hr_key_results_okr ON public.hr_key_results(okr_id);

CREATE INDEX idx_hr_feedback_workspace ON public.hr_feedback(workspace_id);
CREATE INDEX idx_hr_feedback_from ON public.hr_feedback(from_employee_id);
CREATE INDEX idx_hr_feedback_to ON public.hr_feedback(to_employee_id);

CREATE INDEX idx_hr_checkins_workspace ON public.hr_checkins(workspace_id);
CREATE INDEX idx_hr_checkins_employee ON public.hr_checkins(employee_id);
CREATE INDEX idx_hr_checkins_manager ON public.hr_checkins(manager_id);
CREATE INDEX idx_hr_checkins_scheduled ON public.hr_checkins(scheduled_at);
CREATE INDEX idx_hr_checkins_status ON public.hr_checkins(status);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.hr_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_checkins ENABLE ROW LEVEL SECURITY;

-- hr_okrs: visible to workspace members
CREATE POLICY "workspace_read_okrs" ON public.hr_okrs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_okrs.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "owner_manage_okrs" ON public.hr_okrs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_okrs.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
    OR created_by = auth.uid()
    OR employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_okrs.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
    OR created_by = auth.uid()
    OR employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
  );

-- hr_key_results: same as parent OKR via workspace
CREATE POLICY "workspace_read_key_results" ON public.hr_key_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_key_results.workspace_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "manage_key_results" ON public.hr_key_results
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_key_results.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.hr_okrs o
      JOIN public.hr_employees e ON e.id = o.employee_id
      WHERE o.id = hr_key_results.okr_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_key_results.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.hr_okrs o
      JOIN public.hr_employees e ON e.id = o.employee_id
      WHERE o.id = hr_key_results.okr_id AND e.user_id = auth.uid()
    )
  );

-- hr_feedback: sender + recipient can see; non-private visible to all workspace
CREATE POLICY "read_feedback" ON public.hr_feedback
  FOR SELECT TO authenticated
  USING (
    from_employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR to_employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = hr_feedback.workspace_id AND wm.user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_feedback.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "create_feedback" ON public.hr_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_feedback.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- hr_checkins: employee + manager can see
CREATE POLICY "read_checkins" ON public.hr_checkins
  FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR manager_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_checkins.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "manage_checkins" ON public.hr_checkins
  FOR ALL TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR manager_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_checkins.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR manager_id IN (SELECT id FROM public.hr_employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = hr_checkins.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner')
    )
  );
