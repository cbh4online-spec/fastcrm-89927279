
CREATE TABLE public.deal_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id  uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  close_score     numeric NOT NULL DEFAULT 0,
  category        text NOT NULL DEFAULT 'uncertain',
  urgency         text NOT NULL DEFAULT 'normal',
  next_action     text,
  score_breakdown jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id)
);

CREATE INDEX idx_deal_scores_workspace_score ON public.deal_scores(workspace_id, close_score DESC);
CREATE INDEX idx_deal_scores_workspace_category ON public.deal_scores(workspace_id, category);

ALTER TABLE public.deal_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read deal scores"
  ON public.deal_scores FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role manages deal scores"
  ON public.deal_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
