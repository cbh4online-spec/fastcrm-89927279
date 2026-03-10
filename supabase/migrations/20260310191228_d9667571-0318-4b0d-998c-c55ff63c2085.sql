-- Add SLA and escalation tracking to security_occurrences
ALTER TABLE public.security_occurrences 
  ADD COLUMN IF NOT EXISTS sla_response_hours integer DEFAULT 4,
  ADD COLUMN IF NOT EXISTS sla_resolution_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sla_response_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS sla_resolution_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS sla_response_met boolean,
  ADD COLUMN IF NOT EXISTS sla_resolution_met boolean,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 0;

-- Create occurrence activity log for timeline
CREATE TABLE IF NOT EXISTS public.security_occurrence_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.security_occurrences(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  description text NOT NULL,
  user_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_occurrence_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage occurrence activities in their workspace"
  ON public.security_occurrence_activities
  FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE id = workspace_id))
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE id = workspace_id));

-- Auto-calculate SLA deadlines trigger
CREATE OR REPLACE FUNCTION public.set_occurrence_sla_deadlines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.occurred_at IS NOT NULL AND NEW.sla_response_deadline IS NULL THEN
    NEW.sla_response_deadline := NEW.occurred_at + (COALESCE(NEW.sla_response_hours, 4) || ' hours')::interval;
    NEW.sla_resolution_deadline := NEW.occurred_at + (COALESCE(NEW.sla_resolution_hours, 24) || ' hours')::interval;
  END IF;
  
  -- Auto-calculate priority score based on severity
  NEW.priority_score := CASE NEW.severity
    WHEN 'critical' THEN 100
    WHEN 'high' THEN 75
    WHEN 'medium' THEN 50
    WHEN 'low' THEN 25
    ELSE 0
  END;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_occurrence_sla
  BEFORE INSERT ON public.security_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_occurrence_sla_deadlines();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_occurrence_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.security_occurrence_activities (
      occurrence_id, workspace_id, activity_type, description, user_id, metadata
    ) VALUES (
      NEW.id, NEW.workspace_id, 'status_change',
      'Estado alterado de ' || OLD.status || ' para ' || NEW.status,
      auth.uid(),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
    
    -- Check SLA on first response
    IF OLD.status = 'open' AND NEW.status IN ('in_progress', 'waiting_parts') AND NEW.first_response_at IS NULL THEN
      NEW.first_response_at := now();
      NEW.sla_response_met := (now() <= COALESCE(NEW.sla_response_deadline, now()));
    END IF;
    
    -- Check SLA on resolution
    IF NEW.status IN ('resolved', 'closed') AND NEW.resolved_at IS NOT NULL THEN
      NEW.sla_resolution_met := (NEW.resolved_at::timestamptz <= COALESCE(NEW.sla_resolution_deadline, NEW.resolved_at::timestamptz));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_occurrence_status
  BEFORE UPDATE ON public.security_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.log_occurrence_status_change();