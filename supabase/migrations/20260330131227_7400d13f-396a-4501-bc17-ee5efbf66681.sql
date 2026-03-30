
-- Audit log for ticket changes
CREATE TABLE public.support_ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_support_ticket_history_ticket ON public.support_ticket_history(ticket_id);
CREATE INDEX idx_support_ticket_history_workspace ON public.support_ticket_history(workspace_id);

-- RLS
ALTER TABLE public.support_ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view ticket history"
  ON public.support_ticket_history FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert ticket history"
  ON public.support_ticket_history FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Add columns to support_ticket_messages if not exist
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload ticket attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Anyone can view ticket attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Users can delete own ticket attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ticket-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
