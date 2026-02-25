
CREATE TABLE public.opportunity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.opportunity_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_opp_comments_opportunity ON public.opportunity_comments(opportunity_id);
CREATE INDEX idx_opp_comments_parent ON public.opportunity_comments(parent_id);

ALTER TABLE public.opportunity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments in their workspace"
  ON public.opportunity_comments FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert comments in their workspace"
  ON public.opportunity_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.opportunity_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.opportunity_comments FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_comments;
