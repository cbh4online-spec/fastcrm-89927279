-- Traffic alert rules (thresholds)
CREATE TABLE public.store_traffic_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_type text NOT NULL DEFAULT 'sessions',
  threshold_value numeric NOT NULL DEFAULT 10,
  comparison_period_hours integer NOT NULL DEFAULT 24,
  comparison_type text NOT NULL DEFAULT 'below',
  is_active boolean NOT NULL DEFAULT true,
  notify_email text,
  cooldown_hours integer NOT NULL DEFAULT 24,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_traffic_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view traffic alert rules"
  ON public.store_traffic_alert_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_traffic_alert_rules.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create traffic alert rules"
  ON public.store_traffic_alert_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_traffic_alert_rules.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update traffic alert rules"
  ON public.store_traffic_alert_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_traffic_alert_rules.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete traffic alert rules"
  ON public.store_traffic_alert_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_traffic_alert_rules.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Alert log (fired alerts)
CREATE TABLE public.store_traffic_alerts_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.store_traffic_alert_rules(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  threshold_value numeric NOT NULL,
  comparison_period_hours integer NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_traffic_alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view traffic alerts"
  ON public.store_traffic_alerts_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_traffic_alerts_log.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update traffic alerts"
  ON public.store_traffic_alerts_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_traffic_alerts_log.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_traffic_alert_rules_workspace ON public.store_traffic_alert_rules(workspace_id);
CREATE INDEX idx_traffic_alerts_log_workspace ON public.store_traffic_alerts_log(workspace_id, created_at DESC);
CREATE INDEX idx_traffic_alerts_log_rule ON public.store_traffic_alerts_log(rule_id, created_at DESC);