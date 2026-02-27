
CREATE TABLE public.daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  summary TEXT,
  hot_leads TEXT,
  stuck_deals TEXT,
  revenue_highlight TEXT,
  action_suggestions TEXT[] DEFAULT '{}',
  key_metrics JSONB DEFAULT '{}'
);

ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read daily briefs"
  ON public.daily_briefs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service role manages daily briefs"
  ON public.daily_briefs FOR ALL
  USING (auth.role() = 'service_role');
