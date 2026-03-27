
-- Metric type enum
CREATE TYPE public.pipeline_metric_type AS ENUM ('volume', 'value', 'conversion', 'time', 'quality', 'custom');

-- Metric formula enum
CREATE TYPE public.pipeline_metric_formula AS ENUM ('count', 'sum', 'avg', 'percentage', 'duration', 'event_count');

-- Target period enum
CREATE TYPE public.pipeline_metric_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual');

-- Alert channel enum
CREATE TYPE public.pipeline_alert_channel AS ENUM ('in_app', 'email', 'webhook');

-- ========== 1. Metric Definitions ==========
CREATE TABLE public.pipeline_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric_type public.pipeline_metric_type NOT NULL DEFAULT 'custom',
  formula public.pipeline_metric_formula NOT NULL DEFAULT 'count',
  source_table TEXT NOT NULL DEFAULT 'leads',
  source_field TEXT,
  filter_json JSONB NOT NULL DEFAULT '{}',
  unit TEXT DEFAULT '',
  icon TEXT DEFAULT 'BarChart3',
  color TEXT DEFAULT '#6366f1',
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

ALTER TABLE public.pipeline_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace metrics"
  ON public.pipeline_metrics FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage workspace metrics"
  ON public.pipeline_metrics FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Super admin full access on pipeline_metrics"
  ON public.pipeline_metrics FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ========== 2. Metric Targets ==========
CREATE TABLE public.pipeline_metric_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.pipeline_metrics(id) ON DELETE CASCADE,
  period public.pipeline_metric_period NOT NULL DEFAULT 'monthly',
  target_value NUMERIC NOT NULL DEFAULT 0,
  pipeline_id UUID,
  stage_id UUID,
  team_id UUID,
  user_id UUID REFERENCES auth.users(id),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_metric_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace targets"
  ON public.pipeline_metric_targets FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage workspace targets"
  ON public.pipeline_metric_targets FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Super admin full access on pipeline_metric_targets"
  ON public.pipeline_metric_targets FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ========== 3. Metric Alerts ==========
CREATE TABLE public.pipeline_metric_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.pipeline_metrics(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.pipeline_metric_targets(id) ON DELETE SET NULL,
  channel public.pipeline_alert_channel NOT NULL DEFAULT 'in_app',
  condition TEXT NOT NULL DEFAULT 'below_target',
  threshold_pct NUMERIC DEFAULT 80,
  webhook_url TEXT,
  recipient_user_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_metric_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace alerts"
  ON public.pipeline_metric_alerts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage workspace alerts"
  ON public.pipeline_metric_alerts FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Super admin full access on pipeline_metric_alerts"
  ON public.pipeline_metric_alerts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ========== 4. Metric Snapshots (calculated values) ==========
CREATE TABLE public.pipeline_metric_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.pipeline_metrics(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.pipeline_metric_targets(id) ON DELETE SET NULL,
  period public.pipeline_metric_period NOT NULL DEFAULT 'daily',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC,
  previous_value NUMERIC,
  pct_of_target NUMERIC,
  pct_change NUMERIC,
  breakdown_json JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace snapshots"
  ON public.pipeline_metric_snapshots FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service can insert snapshots"
  ON public.pipeline_metric_snapshots FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Super admin full access on pipeline_metric_snapshots"
  ON public.pipeline_metric_snapshots FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_pipeline_metrics_workspace ON public.pipeline_metrics(workspace_id);
CREATE INDEX idx_pipeline_metric_targets_metric ON public.pipeline_metric_targets(metric_id);
CREATE INDEX idx_pipeline_metric_targets_workspace ON public.pipeline_metric_targets(workspace_id);
CREATE INDEX idx_pipeline_metric_snapshots_metric_period ON public.pipeline_metric_snapshots(metric_id, period_start);
CREATE INDEX idx_pipeline_metric_snapshots_workspace ON public.pipeline_metric_snapshots(workspace_id);
CREATE INDEX idx_pipeline_metric_alerts_metric ON public.pipeline_metric_alerts(metric_id);
