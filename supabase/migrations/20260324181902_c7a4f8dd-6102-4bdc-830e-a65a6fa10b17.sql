
-- Watchlist table
CREATE TABLE public.account_brief_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  watch_reason TEXT NOT NULL DEFAULT 'strategic',
  refresh_frequency TEXT NOT NULL DEFAULT 'weekly',
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, account_id)
);

ALTER TABLE public.account_brief_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view watchlists" ON public.account_brief_watchlists
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert watchlists" ON public.account_brief_watchlists
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update watchlists" ON public.account_brief_watchlists
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete watchlists" ON public.account_brief_watchlists
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Change alerts table
CREATE TABLE public.account_brief_change_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  current_run_id UUID REFERENCES public.account_brief_analysis_runs(id),
  previous_run_id UUID REFERENCES public.account_brief_analysis_runs(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  commercial_relevance TEXT NOT NULL DEFAULT 'informative',
  title TEXT NOT NULL,
  summary TEXT,
  payload_json JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_change_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view change alerts" ON public.account_brief_change_alerts
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update change alerts" ON public.account_brief_change_alerts
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can insert change alerts" ON public.account_brief_change_alerts
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
