
-- Create email-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for email-attachments bucket
CREATE POLICY "Authenticated users can upload email attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "Anyone can read email attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-attachments');

CREATE POLICY "Users can delete own email attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'email-attachments');

-- Create scheduled_emails table
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL,
  conversation_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_html BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view scheduled emails in their workspace"
ON public.scheduled_emails FOR SELECT TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert scheduled emails in their workspace"
ON public.scheduled_emails FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update scheduled emails in their workspace"
ON public.scheduled_emails FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scheduled emails in their workspace"
ON public.scheduled_emails FOR DELETE TO authenticated
USING (
  workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
  )
);
