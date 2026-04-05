CREATE TABLE public.sdr_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.sdr_campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  enrolled integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  opened integer NOT NULL DEFAULT 0,
  clicked integer NOT NULL DEFAULT 0,
  replied integer NOT NULL DEFAULT 0,
  meetings integer NOT NULL DEFAULT 0,
  converted integer NOT NULL DEFAULT 0,
  opted_out integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, stat_date)
);

CREATE INDEX idx_sdr_daily_stats_workspace ON public.sdr_daily_stats(workspace_id);
CREATE INDEX idx_sdr_daily_stats_date ON public.sdr_daily_stats(stat_date DESC);

ALTER TABLE public.sdr_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace stats"
  ON public.sdr_daily_stats FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );
