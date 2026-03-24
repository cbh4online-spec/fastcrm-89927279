
-- Segments table
CREATE TABLE public.account_brief_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment_type TEXT NOT NULL DEFAULT 'dynamic',
  filter_json JSONB NOT NULL DEFAULT '{}',
  is_dynamic BOOLEAN NOT NULL DEFAULT true,
  member_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_segments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ab_segments_workspace ON public.account_brief_segments(workspace_id);

CREATE POLICY "Users can manage segments in their workspace"
  ON public.account_brief_segments FOR ALL TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

-- Segment members table
CREATE TABLE public.account_brief_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.account_brief_segments(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_brief_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(segment_id, account_id)
);

ALTER TABLE public.account_brief_segment_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ab_segment_members_segment ON public.account_brief_segment_members(segment_id);
CREATE INDEX idx_ab_segment_members_workspace ON public.account_brief_segment_members(workspace_id);

CREATE POLICY "Users can manage segment members in their workspace"
  ON public.account_brief_segment_members FOR ALL TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

-- Comparison runs table
CREATE TABLE public.account_brief_comparison_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_ids JSONB NOT NULL DEFAULT '[]',
  summary_json JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_brief_comparison_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ab_comparison_runs_workspace ON public.account_brief_comparison_runs(workspace_id);

CREATE POLICY "Users can manage comparison runs in their workspace"
  ON public.account_brief_comparison_runs FOR ALL TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));
