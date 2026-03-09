
-- Performance KPIs table
CREATE TABLE public.performance_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  kpi_type TEXT NOT NULL DEFAULT 'activity',
  entity_source TEXT NOT NULL,
  calculation_method TEXT NOT NULL DEFAULT 'count',
  weight NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance_kpis in their workspace"
  ON public.performance_kpis FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage performance_kpis in their workspace"
  ON public.performance_kpis FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Performance Goals table
CREATE TABLE public.performance_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  goal_name TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'individual',
  kpi_id UUID REFERENCES public.performance_kpis(id) ON DELETE SET NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'company',
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance_goals in their workspace"
  ON public.performance_goals FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage performance_goals in their workspace"
  ON public.performance_goals FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Performance Scores table
CREATE TABLE public.performance_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'weekly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue_generated NUMERIC NOT NULL DEFAULT 0,
  pipeline_generated NUMERIC NOT NULL DEFAULT 0,
  meetings_booked INTEGER NOT NULL DEFAULT 0,
  proposals_sent INTEGER NOT NULL DEFAULT 0,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC NOT NULL DEFAULT 0,
  score_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id, period_type, period_start)
);

ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance_scores in their workspace"
  ON public.performance_scores FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage performance_scores in their workspace"
  ON public.performance_scores FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Performance Challenges table
CREATE TABLE public.performance_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'revenue_sprint',
  description TEXT,
  metric_type TEXT NOT NULL DEFAULT 'revenue',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  scope_type TEXT NOT NULL DEFAULT 'company',
  scope_id UUID,
  reward_type TEXT DEFAULT 'recognition',
  reward_value TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance_challenges in their workspace"
  ON public.performance_challenges FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage performance_challenges in their workspace"
  ON public.performance_challenges FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Challenge Participants table
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.performance_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  rank_position INTEGER,
  points NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenge_participants"
  ON public.challenge_participants FOR SELECT TO authenticated
  USING (challenge_id IN (
    SELECT id FROM public.performance_challenges WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage challenge_participants"
  ON public.challenge_participants FOR ALL TO authenticated
  USING (challenge_id IN (
    SELECT id FROM public.performance_challenges WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Performance Recognition table
CREATE TABLE public.performance_recognition (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  recognition_type TEXT NOT NULL DEFAULT 'closer_of_month',
  title TEXT NOT NULL,
  description TEXT,
  criteria_json JSONB DEFAULT '{}',
  reward_type TEXT DEFAULT 'badge',
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_recognition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance_recognition in their workspace"
  ON public.performance_recognition FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage performance_recognition in their workspace"
  ON public.performance_recognition FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Add realtime for leaderboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
