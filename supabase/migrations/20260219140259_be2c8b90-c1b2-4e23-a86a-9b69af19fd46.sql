CREATE TABLE public.weekly_briefs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at       timestamptz DEFAULT now(),
  summary          text,
  opportunity      text,
  risk             text,
  market_signal    text,
  priority_actions jsonb,
  key_metrics      jsonb
);

CREATE INDEX weekly_briefs_workspace_created_idx ON public.weekly_briefs(workspace_id, created_at DESC);

ALTER TABLE public.weekly_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read weekly briefs"
  ON public.weekly_briefs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role manages weekly briefs"
  ON public.weekly_briefs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');