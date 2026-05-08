
ALTER TABLE public.leadchef_lead_sequence_runs
  ADD COLUMN IF NOT EXISTS enrollment_stage text;

CREATE TABLE IF NOT EXISTS public.leadchef_sequence_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.leadchef_lead_sequence_runs(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  sequence_id uuid NOT NULL,
  step_order int,
  action_type text,
  status text NOT NULL,            -- stepped | paused | completed | skipped | error
  reason text,                     -- lead_replied | stage_changed | no_more_steps | ...
  message text,                    -- short human-readable line
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadchef_seq_run_logs_run ON public.leadchef_sequence_run_logs (run_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadchef_seq_run_logs_workspace ON public.leadchef_sequence_run_logs (workspace_id, executed_at DESC);

ALTER TABLE public.leadchef_sequence_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leadchef_seq_run_logs_select_member"
  ON public.leadchef_sequence_run_logs FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- INSERT/UPDATE/DELETE intentionally restricted to service_role (no policy = denied for authenticated).

CREATE OR REPLACE FUNCTION public.enroll_lead_in_leadchef_sequence(p_lead_id uuid, p_sequence_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ws UUID;
  v_run_id UUID;
  v_stage TEXT;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.leadchef_sequences WHERE id = p_sequence_id;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'sequence_not_found'; END IF;
  IF NOT public.is_workspace_member(v_ws, auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT stage INTO v_stage FROM public.leadchef_lead_profiles
    WHERE workspace_id = v_ws AND lead_id = p_lead_id LIMIT 1;

  INSERT INTO public.leadchef_lead_sequence_runs
    (workspace_id, lead_id, sequence_id, enrolled_by, next_run_at, status, enrollment_stage)
  VALUES
    (v_ws, p_lead_id, p_sequence_id, auth.uid(), now(), 'active', v_stage)
  ON CONFLICT (lead_id, sequence_id) DO UPDATE
    SET status = 'active',
        next_run_at = now(),
        enrollment_stage = COALESCE(EXCLUDED.enrollment_stage, public.leadchef_lead_sequence_runs.enrollment_stage)
  RETURNING id INTO v_run_id;

  INSERT INTO public.leadchef_sequence_run_logs
    (workspace_id, run_id, lead_id, sequence_id, status, reason, message, metadata)
  VALUES
    (v_ws, v_run_id, p_lead_id, p_sequence_id, 'enrolled', null, 'Lead inscrito na sequência',
     jsonb_build_object('stage', v_stage));

  RETURN v_run_id;
END;
$function$;
