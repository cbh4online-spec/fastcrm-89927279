-- Create trigger_job_runs table for Trigger.dev integration
CREATE TABLE public.trigger_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  trigger_run_id TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  recommendation_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  idempotency_key TEXT,
  input_data JSONB DEFAULT '{}',
  output_data JSONB,
  error_data JSONB,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_trigger_job_runs_workspace ON public.trigger_job_runs(workspace_id);
CREATE INDEX idx_trigger_job_runs_status ON public.trigger_job_runs(status);
CREATE INDEX idx_trigger_job_runs_job_type ON public.trigger_job_runs(job_type);
CREATE INDEX idx_trigger_job_runs_entity ON public.trigger_job_runs(entity_type, entity_id);
CREATE INDEX idx_trigger_job_runs_idempotency ON public.trigger_job_runs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_trigger_job_runs_scheduled ON public.trigger_job_runs(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Enable RLS
ALTER TABLE public.trigger_job_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view trigger jobs in their workspaces"
ON public.trigger_job_runs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = trigger_job_runs.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert trigger jobs in their workspaces"
ON public.trigger_job_runs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = trigger_job_runs.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update trigger jobs in their workspaces"
ON public.trigger_job_runs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = trigger_job_runs.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Auto-update updated_at trigger
CREATE TRIGGER update_trigger_job_runs_updated_at
BEFORE UPDATE ON public.trigger_job_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();