
-- Create renewal activities table for timeline tracking
CREATE TABLE IF NOT EXISTS public.security_renewal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid NOT NULL REFERENCES public.security_renewals(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  description text NOT NULL,
  user_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_renewal_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage renewal activities in their workspace"
  ON public.security_renewal_activities
  FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE id = workspace_id))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE id = workspace_id));

-- Add additional fields to security_renewals
ALTER TABLE public.security_renewals
  ADD COLUMN IF NOT EXISTS renewal_value numeric,
  ADD COLUMN IF NOT EXISTS previous_value numeric,
  ADD COLUMN IF NOT EXISTS contact_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_response text,
  ADD COLUMN IF NOT EXISTS new_contract_id uuid REFERENCES public.security_contracts(id);

-- Auto-log stage changes on renewals
CREATE OR REPLACE FUNCTION public.log_renewal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.renewal_stage IS DISTINCT FROM NEW.renewal_stage THEN
    INSERT INTO public.security_renewal_activities (
      renewal_id, workspace_id, activity_type, description, user_id, metadata
    ) VALUES (
      NEW.id, NEW.workspace_id, 'stage_change',
      'Estágio alterado de ' || OLD.renewal_stage || ' para ' || NEW.renewal_stage,
      auth.uid(),
      jsonb_build_object('old_stage', OLD.renewal_stage, 'new_stage', NEW.renewal_stage)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_renewal_stage
  AFTER UPDATE ON public.security_renewals
  FOR EACH ROW
  EXECUTE FUNCTION public.log_renewal_stage_change();

-- Function to auto-create renewal records for contracts approaching end_date
CREATE OR REPLACE FUNCTION public.auto_create_security_renewals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract RECORD;
  days_until_end integer;
  stage text;
BEGIN
  FOR contract IN
    SELECT c.id, c.workspace_id, c.end_date, c.system_id,
           c.commercial_terms_json
    FROM public.security_contracts c
    WHERE c.contract_status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date::date <= (CURRENT_DATE + interval '90 days')
      AND NOT EXISTS (
        SELECT 1 FROM public.security_renewals r
        WHERE r.contract_id = c.id
          AND r.renewal_stage NOT IN ('renewed', 'lost', 'expired')
      )
  LOOP
    days_until_end := (contract.end_date::date - CURRENT_DATE);
    IF days_until_end <= 30 THEN
      stage := 'upcoming_30';
    ELSIF days_until_end <= 60 THEN
      stage := 'upcoming_60';
    ELSE
      stage := 'upcoming_90';
    END IF;

    INSERT INTO public.security_renewals (
      contract_id, workspace_id, system_id, renewal_due_date, renewal_stage
    ) VALUES (
      contract.id, contract.workspace_id, contract.system_id,
      contract.end_date, stage
    );
  END LOOP;
END;
$$;
