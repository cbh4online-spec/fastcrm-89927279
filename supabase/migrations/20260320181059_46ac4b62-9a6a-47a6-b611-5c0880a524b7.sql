
-- Premium template library
CREATE TABLE public.email_template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  industry text,
  objective text,
  thumbnail_url text,
  body_html text NOT NULL,
  design_json jsonb,
  is_premium boolean DEFAULT false,
  sort_order int DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_template_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read template library"
ON public.email_template_library FOR SELECT TO authenticated
USING (true);

-- Pipeline email triggers
CREATE TABLE public.pipeline_email_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_id uuid,
  from_stage text,
  to_stage text NOT NULL,
  action_type text NOT NULL DEFAULT 'send_email' CHECK (action_type IN ('send_email', 'enroll_sequence', 'send_campaign')),
  template_id uuid,
  sequence_id uuid,
  campaign_id uuid,
  email_subject text,
  email_body text,
  delay_minutes int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipeline_email_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage pipeline triggers"
ON public.pipeline_email_triggers FOR ALL TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
)
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Add condition columns to email_sequence_steps
ALTER TABLE public.email_sequence_steps
  ADD COLUMN IF NOT EXISTS condition_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS condition_value jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS step_type text DEFAULT 'email' CHECK (step_type IN ('email', 'delay', 'condition', 'action'));
