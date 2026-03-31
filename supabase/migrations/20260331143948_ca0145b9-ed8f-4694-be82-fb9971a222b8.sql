
-- ═══════════════════════════════════════════════════════════════
-- HR Performance Reviews Module — 7 tables
-- ═══════════════════════════════════════════════════════════════

-- 1. hr_review_cycles
CREATE TABLE public.hr_review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL,
  cycle_type text NOT NULL DEFAULT 'annual',
  status text NOT NULL DEFAULT 'draft',
  self_review_deadline timestamptz,
  manager_review_deadline timestamptz,
  calibration_deadline timestamptz,
  final_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_review_cycles_workspace ON public.hr_review_cycles(workspace_id);
CREATE INDEX idx_hr_review_cycles_status ON public.hr_review_cycles(workspace_id, status);

ALTER TABLE public.hr_review_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view review cycles"
  ON public.hr_review_cycles FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage review cycles"
  ON public.hr_review_cycles FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 2. hr_competencies
CREATE TABLE public.hr_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  level text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_competencies_workspace ON public.hr_competencies(workspace_id);

ALTER TABLE public.hr_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view competencies"
  ON public.hr_competencies FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage competencies"
  ON public.hr_competencies FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3. hr_performance_reviews
CREATE TABLE public.hr_performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  review_cycle_id uuid NOT NULL REFERENCES public.hr_review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_self',
  self_rating integer,
  self_achievements jsonb DEFAULT '[]'::jsonb,
  self_challenges text,
  self_comments text,
  self_submitted_at timestamptz,
  manager_rating integer,
  manager_strengths text,
  manager_areas_improvement text,
  manager_comments text,
  manager_submitted_at timestamptz,
  final_rating integer,
  final_comments text,
  ai_suggested_rating integer,
  ai_analysis jsonb,
  promotion_recommended boolean DEFAULT false,
  salary_adjustment_recommended boolean DEFAULT false,
  salary_adjustment_percentage numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, review_cycle_id)
);

CREATE INDEX idx_hr_perf_reviews_cycle ON public.hr_performance_reviews(review_cycle_id);
CREATE INDEX idx_hr_perf_reviews_employee ON public.hr_performance_reviews(employee_id);
CREATE INDEX idx_hr_perf_reviews_manager ON public.hr_performance_reviews(manager_id);
CREATE INDEX idx_hr_perf_reviews_workspace ON public.hr_performance_reviews(workspace_id);

ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view performance reviews"
  ON public.hr_performance_reviews FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage performance reviews"
  ON public.hr_performance_reviews FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4. hr_review_competency_ratings
CREATE TABLE public.hr_review_competency_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.hr_performance_reviews(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.hr_competencies(id) ON DELETE CASCADE,
  self_rating integer,
  manager_rating integer,
  peer_avg_rating numeric(3,1),
  final_rating integer,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, competency_id)
);

CREATE INDEX idx_hr_comp_ratings_review ON public.hr_review_competency_ratings(review_id);

ALTER TABLE public.hr_review_competency_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view competency ratings"
  ON public.hr_review_competency_ratings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage competency ratings"
  ON public.hr_review_competency_ratings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 5. hr_peer_reviews
CREATE TABLE public.hr_peer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.hr_performance_reviews(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  rating integer,
  strengths text,
  areas_improvement text,
  comments text,
  is_anonymous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reviewer_id != reviewee_id)
);

CREATE INDEX idx_hr_peer_reviews_review ON public.hr_peer_reviews(review_id);
CREATE INDEX idx_hr_peer_reviews_reviewer ON public.hr_peer_reviews(reviewer_id);

ALTER TABLE public.hr_peer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view peer reviews"
  ON public.hr_peer_reviews FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage peer reviews"
  ON public.hr_peer_reviews FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 6. hr_calibration_sessions
CREATE TABLE public.hr_calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  review_cycle_id uuid NOT NULL REFERENCES public.hr_review_cycles(id) ON DELETE CASCADE,
  name text NOT NULL,
  scheduled_date timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  participants jsonb DEFAULT '[]'::jsonb,
  decisions jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_calibration_cycle ON public.hr_calibration_sessions(review_cycle_id);

ALTER TABLE public.hr_calibration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view calibration sessions"
  ON public.hr_calibration_sessions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage calibration sessions"
  ON public.hr_calibration_sessions FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 7. hr_review_activities
CREATE TABLE public.hr_review_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.hr_performance_reviews(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_review_activities_review ON public.hr_review_activities(review_id);

ALTER TABLE public.hr_review_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view review activities"
  ON public.hr_review_activities FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert review activities"
  ON public.hr_review_activities FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- Triggers: updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER set_hr_review_cycles_updated_at BEFORE UPDATE ON public.hr_review_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_competencies_updated_at BEFORE UPDATE ON public.hr_competencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_performance_reviews_updated_at BEFORE UPDATE ON public.hr_performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_review_comp_ratings_updated_at BEFORE UPDATE ON public.hr_review_competency_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_peer_reviews_updated_at BEFORE UPDATE ON public.hr_peer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_hr_calibration_sessions_updated_at BEFORE UPDATE ON public.hr_calibration_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- Validation trigger: deadline ordering
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.validate_review_cycle_deadlines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.self_review_deadline IS NOT NULL AND NEW.manager_review_deadline IS NOT NULL
     AND NEW.self_review_deadline > NEW.manager_review_deadline THEN
    RAISE EXCEPTION 'self_review_deadline must be before manager_review_deadline';
  END IF;
  IF NEW.manager_review_deadline IS NOT NULL AND NEW.calibration_deadline IS NOT NULL
     AND NEW.manager_review_deadline > NEW.calibration_deadline THEN
    RAISE EXCEPTION 'manager_review_deadline must be before calibration_deadline';
  END IF;
  IF NEW.calibration_deadline IS NOT NULL AND NEW.final_deadline IS NOT NULL
     AND NEW.calibration_deadline > NEW.final_deadline THEN
    RAISE EXCEPTION 'calibration_deadline must be before final_deadline';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_hr_review_cycle_deadlines
  BEFORE INSERT OR UPDATE ON public.hr_review_cycles
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_cycle_deadlines();
