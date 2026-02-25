
-- Function for automatic lifecycle stage transitions
CREATE OR REPLACE FUNCTION public.fn_lifecycle_auto_transition()
RETURNS TRIGGER AS $$
DECLARE
  current_order int;
  candidate_stage text;
  candidate_order int;
BEGIN
  -- Helper: stage order (visitor=0, lead=1, prospect=2, sales=3, onboarding=4, customer=5)
  -- churned is special: always allowed

  -- Get current lifecycle order
  current_order := CASE COALESCE(NEW.lifecycle_stage, 'visitor')
    WHEN 'visitor' THEN 0
    WHEN 'lead' THEN 1
    WHEN 'prospect' THEN 2
    WHEN 'sales' THEN 3
    WHEN 'onboarding' THEN 4
    WHEN 'customer' THEN 5
    ELSE 0
  END;

  candidate_stage := NULL;

  -- For INSERT: set initial lifecycle based on lead_status
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_stage IS NULL OR NEW.lifecycle_stage = 'visitor' THEN
      IF NEW.client_status = 'ativo' THEN
        candidate_stage := 'onboarding';
      ELSIF NEW.lead_status = 'customer' THEN
        candidate_stage := 'sales';
      ELSIF NEW.lead_status = 'qualified' THEN
        candidate_stage := 'prospect';
      ELSIF NEW.lead_status IN ('contacted', 'new') AND NEW.lead_status != 'new' THEN
        candidate_stage := 'lead';
      ELSIF NEW.lead_status = 'contacted' THEN
        candidate_stage := 'lead';
      END IF;

      IF candidate_stage IS NOT NULL THEN
        NEW.lifecycle_stage := candidate_stage;
      ELSIF NEW.lifecycle_stage IS NULL THEN
        NEW.lifecycle_stage := 'visitor';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- For UPDATE: only process if lead_status or client_status changed
  IF OLD.lead_status IS NOT DISTINCT FROM NEW.lead_status
     AND OLD.client_status IS NOT DISTINCT FROM NEW.client_status THEN
    RETURN NEW;
  END IF;

  -- Rule: client_status -> 'inativo' or 'churned' => churned (from customer)
  IF NEW.client_status IS DISTINCT FROM OLD.client_status 
     AND NEW.client_status IN ('inativo', 'churned') 
     AND current_order = 5 THEN
    NEW.lifecycle_stage := 'churned';
    RETURN NEW;
  END IF;

  -- Rule: client_status -> 'ativo' => onboarding (order 4)
  IF NEW.client_status IS DISTINCT FROM OLD.client_status 
     AND NEW.client_status = 'ativo' 
     AND current_order < 4 THEN
    NEW.lifecycle_stage := 'onboarding';
    RETURN NEW;
  END IF;

  -- Rule: lead_status -> 'customer' => sales (order 3)
  IF NEW.lead_status IS DISTINCT FROM OLD.lead_status 
     AND NEW.lead_status = 'customer' 
     AND current_order < 3 THEN
    NEW.lifecycle_stage := 'sales';
    RETURN NEW;
  END IF;

  -- Rule: lead_status -> 'qualified' => prospect (order 2) if currently lead or less
  IF NEW.lead_status IS DISTINCT FROM OLD.lead_status 
     AND NEW.lead_status = 'qualified' 
     AND current_order < 2 THEN
    NEW.lifecycle_stage := 'prospect';
    RETURN NEW;
  END IF;

  -- Rule: lead_status -> 'contacted' or 'qualified' => lead (order 1) if currently visitor
  IF NEW.lead_status IS DISTINCT FROM OLD.lead_status 
     AND NEW.lead_status IN ('contacted', 'qualified') 
     AND current_order < 1 THEN
    NEW.lifecycle_stage := 'lead';
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger named to execute BEFORE trg_contact_audit (alphabetical order)
DROP TRIGGER IF EXISTS trg_contact_lifecycle ON public.contacts;
CREATE TRIGGER trg_contact_lifecycle
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_lifecycle_auto_transition();
