
ALTER TABLE public.workspace_email_templates 
  ADD COLUMN IF NOT EXISTS subject_template text,
  ADD COLUMN IF NOT EXISTS body_template text,
  ADD COLUMN IF NOT EXISTS is_auto_send boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS variables_schema jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS send_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;
