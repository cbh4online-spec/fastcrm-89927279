-- Create metrics_snapshots table for historical SaaS metrics
CREATE TABLE public.metrics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mrr_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  arr_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  churn_mrr NUMERIC(15, 2) NOT NULL DEFAULT 0,
  new_mrr NUMERIC(15, 2) NOT NULL DEFAULT 0,
  expansion_mrr NUMERIC(15, 2) NOT NULL DEFAULT 0,
  contraction_mrr NUMERIC(15, 2) NOT NULL DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one snapshot per workspace per date
  CONSTRAINT unique_workspace_date UNIQUE (workspace_id, date)
);

-- Enable RLS
ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view metrics snapshots in their workspace"
  ON public.metrics_snapshots FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create metrics snapshots in their workspace"
  ON public.metrics_snapshots FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update metrics snapshots in their workspace"
  ON public.metrics_snapshots FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_metrics_snapshots_workspace_id ON public.metrics_snapshots(workspace_id);
CREATE INDEX idx_metrics_snapshots_date ON public.metrics_snapshots(date DESC);
CREATE INDEX idx_metrics_snapshots_workspace_date ON public.metrics_snapshots(workspace_id, date DESC);

-- Add comment
COMMENT ON TABLE public.metrics_snapshots IS 'Daily snapshots of SaaS metrics for historical tracking and trends';