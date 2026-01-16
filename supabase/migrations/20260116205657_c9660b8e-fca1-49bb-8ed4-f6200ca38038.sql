
-- Create enum for goal periods
CREATE TYPE public.goal_period AS ENUM ('daily', 'weekly', 'monthly', 'annual');

-- Create enum for goal status
CREATE TYPE public.goal_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');

-- Create productivity_goals table
CREATE TABLE public.productivity_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NULL,
  team_id UUID NULL,
  period goal_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  target_value NUMERIC NULL,
  current_value NUMERIC NULL DEFAULT 0,
  unit TEXT NULL,
  metric_type TEXT NULL,
  status goal_status NOT NULL DEFAULT 'not_started',
  priority INTEGER DEFAULT 1,
  parent_goal_id UUID NULL REFERENCES public.productivity_goals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT goal_owner_check CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  )
);

-- Create daily_priorities table
CREATE TABLE public.daily_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  priority_date DATE NOT NULL DEFAULT CURRENT_DATE,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ NULL,
  linked_entity_type TEXT NULL,
  linked_entity_id UUID NULL,
  ai_generated BOOLEAN DEFAULT false,
  ai_reasoning TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT max_three_priorities CHECK (position >= 1 AND position <= 3)
);

-- Create productivity_insights table for AI-generated insights
CREATE TABLE public.productivity_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  insight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NULL,
  action_url TEXT NULL,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ NULL,
  metadata JSONB NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create meeting_preparations table
CREATE TABLE public.meeting_preparations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  meeting_id UUID NOT NULL,
  preparation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_summary TEXT NULL,
  recent_interactions TEXT NULL,
  key_points TEXT[] NULL DEFAULT '{}',
  suggested_agenda TEXT[] NULL DEFAULT '{}',
  warnings TEXT[] NULL DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.productivity_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_preparations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for productivity_goals
CREATE POLICY "Users can view goals in their workspace"
  ON public.productivity_goals FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create goals"
  ON public.productivity_goals FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their goals"
  ON public.productivity_goals FOR UPDATE
  USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete their goals"
  ON public.productivity_goals FOR DELETE
  USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for daily_priorities
CREATE POLICY "Users can view their priorities"
  ON public.daily_priorities FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their priorities"
  ON public.daily_priorities FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their priorities"
  ON public.daily_priorities FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their priorities"
  ON public.daily_priorities FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for productivity_insights
CREATE POLICY "Users can view their insights"
  ON public.productivity_insights FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their insights"
  ON public.productivity_insights FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for meeting_preparations
CREATE POLICY "Users can view their meeting preparations"
  ON public.meeting_preparations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their meeting preparations"
  ON public.meeting_preparations FOR ALL
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_productivity_goals_workspace ON public.productivity_goals(workspace_id);
CREATE INDEX idx_productivity_goals_user ON public.productivity_goals(user_id);
CREATE INDEX idx_productivity_goals_period ON public.productivity_goals(period, period_start, period_end);
CREATE INDEX idx_daily_priorities_user_date ON public.daily_priorities(user_id, priority_date);
CREATE INDEX idx_productivity_insights_user_date ON public.productivity_insights(user_id, insight_date);
CREATE INDEX idx_meeting_preparations_user_meeting ON public.meeting_preparations(user_id, meeting_id);

-- Triggers
CREATE TRIGGER update_productivity_goals_updated_at
  BEFORE UPDATE ON public.productivity_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_priorities_updated_at
  BEFORE UPDATE ON public.daily_priorities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_preparations_updated_at
  BEFORE UPDATE ON public.meeting_preparations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
