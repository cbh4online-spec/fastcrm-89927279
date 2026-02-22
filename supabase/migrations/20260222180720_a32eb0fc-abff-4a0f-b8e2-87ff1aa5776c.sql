
-- Create prospecting outreach queue table
CREATE TABLE public.prospecting_outreach_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.professional_prospecting_profiles(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_for timestamptz NOT NULL,
  message text,
  message_plain text,
  tone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospecting_outreach_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view outreach queue for their workspace"
ON public.prospecting_outreach_queue FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert into outreach queue for their workspace"
ON public.prospecting_outreach_queue FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update outreach queue for their workspace"
ON public.prospecting_outreach_queue FOR UPDATE
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- Index for cron processor
CREATE INDEX idx_outreach_queue_scheduled ON public.prospecting_outreach_queue (status, scheduled_for)
WHERE status = 'scheduled';

-- Index for pending panel
CREATE INDEX idx_outreach_queue_ready ON public.prospecting_outreach_queue (workspace_id, status)
WHERE status = 'ready';

-- Trigger for updated_at
CREATE TRIGGER update_outreach_queue_updated_at
BEFORE UPDATE ON public.prospecting_outreach_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospecting_outreach_queue;
