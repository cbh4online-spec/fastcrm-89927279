
-- Create performance_targets table
CREATE TABLE public.performance_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  target_value numeric NOT NULL DEFAULT 0,
  period_type text NOT NULL DEFAULT 'weekly',
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_metric_type CHECK (metric_type IN ('revenue', 'leads', 'meetings', 'proposals', 'deals')),
  CONSTRAINT valid_period_type CHECK (period_type IN ('weekly', 'monthly'))
);

-- Enable RLS
ALTER TABLE public.performance_targets ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read
CREATE POLICY "Workspace members can read targets"
  ON public.performance_targets FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- RLS: workspace members can insert
CREATE POLICY "Workspace members can insert targets"
  ON public.performance_targets FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- RLS: workspace members can update
CREATE POLICY "Workspace members can update targets"
  ON public.performance_targets FOR UPDATE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- RLS: workspace members can delete
CREATE POLICY "Workspace members can delete targets"
  ON public.performance_targets FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Index
CREATE INDEX idx_performance_targets_workspace ON public.performance_targets(workspace_id, period_type, period_start);
