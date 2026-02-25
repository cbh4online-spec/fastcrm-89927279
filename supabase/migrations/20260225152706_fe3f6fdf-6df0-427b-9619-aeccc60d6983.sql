
CREATE TABLE public.opportunity_layout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  visible_highlights TEXT[] DEFAULT ARRAY['stage','owner','company','documents','value'],
  highlights_order TEXT[] DEFAULT NULL,
  sidebar_order TEXT[] DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_opp_layout_prefs_workspace ON public.opportunity_layout_preferences(workspace_id);

ALTER TABLE public.opportunity_layout_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own layout preferences"
  ON public.opportunity_layout_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own layout preferences"
  ON public.opportunity_layout_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own layout preferences"
  ON public.opportunity_layout_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own layout preferences"
  ON public.opportunity_layout_preferences FOR DELETE
  USING (auth.uid() = user_id);
