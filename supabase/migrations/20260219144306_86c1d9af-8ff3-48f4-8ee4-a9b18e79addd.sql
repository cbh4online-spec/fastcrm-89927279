
CREATE TABLE public.revenue_forecasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  generated_at    timestamptz NOT NULL DEFAULT now(),

  forecast_7      numeric NOT NULL DEFAULT 0,
  forecast_30     numeric NOT NULL DEFAULT 0,
  forecast_90     numeric NOT NULL DEFAULT 0,

  best_case       numeric NOT NULL DEFAULT 0,
  expected_case   numeric NOT NULL DEFAULT 0,
  worst_case      numeric NOT NULL DEFAULT 0,

  risk_index      numeric NOT NULL DEFAULT 0,
  confidence_avg  numeric NOT NULL DEFAULT 0,

  opportunity_count  integer NOT NULL DEFAULT 0,
  hot_count          integer NOT NULL DEFAULT 0,
  likely_count       integer NOT NULL DEFAULT 0,
  uncertain_count    integer NOT NULL DEFAULT 0,
  low_count          integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.revenue_forecasts(workspace_id, generated_at DESC);

ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read forecasts"
  ON public.revenue_forecasts FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service role manages forecasts"
  ON public.revenue_forecasts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
