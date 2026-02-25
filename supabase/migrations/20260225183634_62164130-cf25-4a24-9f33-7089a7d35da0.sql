
-- Phase 1: Add tags to communication_templates
ALTER TABLE public.communication_templates 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Template favorites
CREATE TABLE public.template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (template_id, user_id)
);

ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
ON public.template_favorites FOR ALL TO authenticated
USING (
  user_id = auth.uid() 
  AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Phase 2: Email Sequences
CREATE TABLE public.email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  exit_conditions jsonb DEFAULT '[]',
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage sequences"
ON public.email_sequences FOR ALL TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
)
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

CREATE TABLE public.email_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  template_id uuid REFERENCES public.communication_templates(id) ON DELETE SET NULL,
  subject text,
  body text,
  delay_days integer DEFAULT 1,
  delay_hours integer DEFAULT 0,
  channel text DEFAULT 'email',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (sequence_id, step_order)
);

ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage sequence steps"
ON public.email_sequence_steps FOR ALL TO authenticated
USING (
  sequence_id IN (
    SELECT id FROM public.email_sequences 
    WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  sequence_id IN (
    SELECT id FROM public.email_sequences 
    WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
);

CREATE TABLE public.email_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  current_step integer DEFAULT 1,
  status text DEFAULT 'active',
  exit_reason text,
  enrolled_by uuid NOT NULL REFERENCES auth.users(id),
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  next_send_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Use a trigger for status validation instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_enrollment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'paused', 'completed', 'exited') THEN
    RAISE EXCEPTION 'Invalid enrollment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_enrollment_status_trigger
BEFORE INSERT OR UPDATE ON public.email_sequence_enrollments
FOR EACH ROW EXECUTE FUNCTION public.validate_enrollment_status();

ALTER TABLE public.email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage enrollments"
ON public.email_sequence_enrollments FOR ALL TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
)
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
