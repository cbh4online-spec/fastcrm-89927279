-- Tabela de fases dos cursos
CREATE TABLE public.sj_course_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  cohort_id UUID NOT NULL REFERENCES public.sj_cohorts(id) ON DELETE CASCADE,
  phase_order INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT sj_course_phases_dates_chk CHECK (end_date >= start_date)
);

CREATE INDEX idx_sj_course_phases_cohort ON public.sj_course_phases(cohort_id, phase_order);
CREATE INDEX idx_sj_course_phases_workspace ON public.sj_course_phases(workspace_id);

-- RLS
ALTER TABLE public.sj_course_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view course phases"
  ON public.sj_course_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_course_phases.workspace_id
        AND wm.user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can insert course phases"
  ON public.sj_course_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_course_phases.workspace_id
        AND wm.user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can update course phases"
  ON public.sj_course_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_course_phases.workspace_id
        AND wm.user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can delete course phases"
  ON public.sj_course_phases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = sj_course_phases.workspace_id
        AND wm.user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER trg_sj_course_phases_updated_at
  BEFORE UPDATE ON public.sj_course_phases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View de compatibilidade: cohorts com agregação de fases
CREATE OR REPLACE VIEW public.sj_cohorts_with_phases
WITH (security_invoker = true) AS
SELECT
  c.*,
  COALESCE(
    (SELECT MIN(p.start_date) FROM public.sj_course_phases p WHERE p.cohort_id = c.id),
    c.start_date
  ) AS computed_start_date,
  COALESCE(
    (SELECT MAX(p.end_date) FROM public.sj_course_phases p WHERE p.cohort_id = c.id),
    c.end_date
  ) AS computed_end_date,
  (SELECT COUNT(*) FROM public.sj_course_phases p WHERE p.cohort_id = c.id) AS phases_count,
  COALESCE(
    (SELECT jsonb_agg(
       jsonb_build_object(
         'id', p.id,
         'phase_order', p.phase_order,
         'title', p.title,
         'location', p.location,
         'start_date', p.start_date,
         'end_date', p.end_date,
         'start_time', p.start_time,
         'end_time', p.end_time,
         'notes', p.notes
       ) ORDER BY p.phase_order, p.start_date
     )
     FROM public.sj_course_phases p WHERE p.cohort_id = c.id),
    '[]'::jsonb
  ) AS phases
FROM public.sj_cohorts c;