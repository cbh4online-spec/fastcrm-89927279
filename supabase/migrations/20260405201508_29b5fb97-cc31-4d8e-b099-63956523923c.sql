
-- Add current_step and next_send_at to sdr_enrollments
ALTER TABLE public.sdr_enrollments
  ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_send_at timestamptz;

-- Create sdr_sequence_step_logs table
CREATE TABLE public.sdr_sequence_step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_enrollment_id uuid NOT NULL REFERENCES public.sdr_enrollments(id) ON DELETE CASCADE,
  sequence_step_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sdr_step_logs_enrollment ON public.sdr_sequence_step_logs(sdr_enrollment_id);
CREATE INDEX idx_sdr_step_logs_workspace ON public.sdr_sequence_step_logs(workspace_id);
CREATE INDEX idx_sdr_step_logs_status ON public.sdr_sequence_step_logs(status);
CREATE INDEX idx_sdr_enrollments_next_send ON public.sdr_enrollments(next_send_at) WHERE status = 'sequenced' AND next_send_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.sdr_sequence_step_logs ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read
CREATE POLICY "Workspace members can view step logs"
  ON public.sdr_sequence_step_logs
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- RLS: only service_role can insert/update (edge functions)
CREATE POLICY "Service role can insert step logs"
  ON public.sdr_sequence_step_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update step logs"
  ON public.sdr_sequence_step_logs
  FOR UPDATE
  TO service_role
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_sdr_sequence_step_logs_updated_at
  BEFORE UPDATE ON public.sdr_sequence_step_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
