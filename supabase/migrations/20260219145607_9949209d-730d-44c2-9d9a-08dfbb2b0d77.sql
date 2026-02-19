
CREATE TABLE public.strategic_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  decision_title    text NOT NULL,
  business_area     text NOT NULL,
  impact_level      text NOT NULL,
  urgency           text NOT NULL,
  explanation       text NOT NULL,
  recommended_steps jsonb NOT NULL DEFAULT '[]',
  status            text NOT NULL DEFAULT 'open',
  rule_key          text
);

CREATE INDEX ON public.strategic_decisions(workspace_id, created_at DESC);
CREATE INDEX ON public.strategic_decisions(workspace_id, status);

ALTER TABLE public.strategic_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read decisions"
  ON public.strategic_decisions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members update decisions"
  ON public.strategic_decisions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service role manages decisions"
  ON public.strategic_decisions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
