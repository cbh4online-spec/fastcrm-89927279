
-- Sequences
CREATE TABLE public.whatsapp_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL DEFAULT 'manual', -- manual | tag_added | lead_created | deal_stage_changed | optin
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  send_window_start time DEFAULT '09:00',
  send_window_end time DEFAULT '20:00',
  stop_on_reply boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_seq_ws ON public.whatsapp_sequences(workspace_id);
CREATE INDEX idx_wa_seq_trigger ON public.whatsapp_sequences(workspace_id, trigger_event) WHERE is_enabled = true;

ALTER TABLE public.whatsapp_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage workspace wa sequences"
ON public.whatsapp_sequences FOR ALL
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Steps
CREATE TABLE public.whatsapp_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.whatsapp_sequences(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  delay_minutes int NOT NULL DEFAULT 0,
  message_body text NOT NULL DEFAULT '',
  template_id uuid,
  media_url text,
  media_type text,
  cta_url text,
  cta_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_seq_steps_seq ON public.whatsapp_sequence_steps(sequence_id, step_order);

ALTER TABLE public.whatsapp_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage steps via sequence"
ON public.whatsapp_sequence_steps FOR ALL
USING (sequence_id IN (
  SELECT id FROM public.whatsapp_sequences
  WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
))
WITH CHECK (sequence_id IN (
  SELECT id FROM public.whatsapp_sequences
  WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
));

-- Enrollments
CREATE TABLE public.whatsapp_sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  sequence_id uuid NOT NULL REFERENCES public.whatsapp_sequences(id) ON DELETE CASCADE,
  contact_id uuid,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active | paused | completed | cancelled | opted_out | failed
  current_step_order int NOT NULL DEFAULT 0,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(sequence_id, phone)
);

CREATE INDEX idx_wa_enroll_ws ON public.whatsapp_sequence_enrollments(workspace_id);
CREATE INDEX idx_wa_enroll_due ON public.whatsapp_sequence_enrollments(next_run_at) WHERE status = 'active';

ALTER TABLE public.whatsapp_sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read enrollments"
ON public.whatsapp_sequence_enrollments FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members manage enrollments"
ON public.whatsapp_sequence_enrollments FOR ALL
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Logs
CREATE TABLE public.whatsapp_sequence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.whatsapp_sequence_enrollments(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  step_order int NOT NULL,
  status text NOT NULL, -- sent | failed | skipped | optout
  provider_message_id text,
  error text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_seq_logs_enr ON public.whatsapp_sequence_logs(enrollment_id, executed_at DESC);

ALTER TABLE public.whatsapp_sequence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read logs"
ON public.whatsapp_sequence_logs FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- updated_at trigger on sequences
CREATE TRIGGER trg_wa_seq_updated
BEFORE UPDATE ON public.whatsapp_sequences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stop sequence on inbound reply
CREATE OR REPLACE FUNCTION public.stop_wa_sequences_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'inbound' AND NEW.phone IS NOT NULL THEN
    UPDATE public.whatsapp_sequence_enrollments e
       SET status = 'paused', last_error = 'stopped_on_reply'
      FROM public.whatsapp_sequences s
     WHERE e.sequence_id = s.id
       AND s.stop_on_reply = true
       AND e.status = 'active'
       AND e.workspace_id = NEW.workspace_id
       AND e.phone = NEW.phone;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_messages') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_stop_wa_seq_on_reply ON public.whatsapp_messages';
    EXECUTE 'CREATE TRIGGER trg_stop_wa_seq_on_reply AFTER INSERT ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION public.stop_wa_sequences_on_reply()';
  END IF;
END $$;
