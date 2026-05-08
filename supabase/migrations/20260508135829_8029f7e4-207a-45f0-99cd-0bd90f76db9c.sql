
-- Sequences
CREATE TABLE IF NOT EXISTS public.leadchef_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_event TEXT NOT NULL DEFAULT 'manual',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_seq_ws ON public.leadchef_sequences(workspace_id);

CREATE TABLE IF NOT EXISTS public.leadchef_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.leadchef_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  delay_days INT NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message_template TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lc_seq_steps_seq ON public.leadchef_sequence_steps(sequence_id, step_order);

CREATE TABLE IF NOT EXISTS public.leadchef_lead_sequence_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  sequence_id UUID NOT NULL REFERENCES public.leadchef_sequences(id) ON DELETE CASCADE,
  current_step_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_step_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enrolled_by UUID,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(lead_id, sequence_id)
);

CREATE INDEX IF NOT EXISTS idx_lc_runs_due ON public.leadchef_lead_sequence_runs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_lc_runs_ws ON public.leadchef_lead_sequence_runs(workspace_id);

ALTER TABLE public.leadchef_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadchef_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leadchef_lead_sequence_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws members read sequences" ON public.leadchef_sequences
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members write sequences" ON public.leadchef_sequences
  FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "ws members read steps" ON public.leadchef_sequence_steps
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.leadchef_sequences s WHERE s.id = sequence_id AND public.is_workspace_member(s.workspace_id, auth.uid())));
CREATE POLICY "ws members write steps" ON public.leadchef_sequence_steps
  FOR ALL USING (EXISTS (SELECT 1 FROM public.leadchef_sequences s WHERE s.id = sequence_id AND public.is_workspace_member(s.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leadchef_sequences s WHERE s.id = sequence_id AND public.is_workspace_member(s.workspace_id, auth.uid())));

CREATE POLICY "ws members read runs" ON public.leadchef_lead_sequence_runs
  FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members write runs" ON public.leadchef_lead_sequence_runs
  FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- Enrollment RPC (idempotent)
CREATE OR REPLACE FUNCTION public.enroll_lead_in_leadchef_sequence(
  p_lead_id UUID,
  p_sequence_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws UUID;
  v_run_id UUID;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.leadchef_sequences WHERE id = p_sequence_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'sequence_not_found'; END IF;
  IF NOT public.is_workspace_member(v_ws, auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  INSERT INTO public.leadchef_lead_sequence_runs (workspace_id, lead_id, sequence_id, enrolled_by, next_run_at, status)
  VALUES (v_ws, p_lead_id, p_sequence_id, auth.uid(), now(), 'active')
  ON CONFLICT (lead_id, sequence_id) DO UPDATE
    SET status = 'active', next_run_at = now()
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;
