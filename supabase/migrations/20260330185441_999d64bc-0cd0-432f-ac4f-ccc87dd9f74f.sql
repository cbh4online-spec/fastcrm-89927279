
-- Executive Snapshots
CREATE TABLE public.executive_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL DEFAULT 'board',
  title TEXT,
  summary TEXT,
  period_start DATE,
  period_end DATE,
  revenue_actual NUMERIC,
  revenue_target NUMERIC,
  revenue_forecast NUMERIC,
  pipeline_actual NUMERIC,
  pipeline_required NUMERIC,
  execution_health INT DEFAULT 50,
  strategic_health INT DEFAULT 50,
  context_health INT DEFAULT 50,
  risk_level TEXT DEFAULT 'medium',
  focus_priority TEXT,
  key_decisions_json JSONB DEFAULT '[]',
  wins_json JSONB DEFAULT '[]',
  risks_json JSONB DEFAULT '[]',
  priorities_json JSONB DEFAULT '[]',
  outlook_30d TEXT,
  outlook_90d TEXT,
  narrative_type TEXT DEFAULT 'stabilization',
  confidence NUMERIC(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_executive_snapshots_ws_type_created ON public.executive_snapshots(workspace_id, snapshot_type, created_at DESC);

ALTER TABLE public.executive_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view executive snapshots" ON public.executive_snapshots
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role inserts executive snapshots" ON public.executive_snapshots
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role updates executive snapshots" ON public.executive_snapshots
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Executive Decision Packs
CREATE TABLE public.executive_decision_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  context_json JSONB DEFAULT '{}',
  options_json JSONB DEFAULT '[]',
  recommended_option TEXT,
  rationale TEXT,
  expected_impact TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.executive_decision_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view decision packs" ON public.executive_decision_packs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update decision packs" ON public.executive_decision_packs
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role inserts decision packs" ON public.executive_decision_packs
  FOR INSERT TO service_role WITH CHECK (true);

-- Executive Mode Settings
CREATE TABLE public.executive_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  default_mode TEXT DEFAULT 'board',
  include_forecast BOOLEAN DEFAULT true,
  include_strategy BOOLEAN DEFAULT true,
  include_risks BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.executive_mode_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view executive settings" ON public.executive_mode_settings
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can upsert executive settings" ON public.executive_mode_settings
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
