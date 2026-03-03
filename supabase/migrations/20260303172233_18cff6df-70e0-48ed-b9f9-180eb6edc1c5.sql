
-- Function to trigger procurement needs recompute via pg_net
CREATE OR REPLACE FUNCTION public.trigger_recompute_procurement_needs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _workspace_id uuid;
  _relevant_statuses text[] := ARRAY['submitted', 'approved', 'in_preparation'];
  _old_relevant boolean;
  _new_relevant boolean;
  _supabase_url text;
  _service_key text;
BEGIN
  _workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  
  -- Check if status changed to/from a relevant status
  _old_relevant := OLD.status = ANY(_relevant_statuses);
  _new_relevant := NEW.status = ANY(_relevant_statuses);
  
  -- Only trigger if relevance changed (entered or left a relevant status)
  IF _old_relevant IS DISTINCT FROM _new_relevant THEN
    -- Use pg_net to call the edge function
    _supabase_url := current_setting('app.settings.supabase_url', true);
    _service_key := current_setting('app.settings.service_role_key', true);
    
    IF _supabase_url IS NOT NULL AND _service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := _supabase_url || '/functions/v1/procurement-needs-recompute',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _service_key
        ),
        body := jsonb_build_object('workspace_id', _workspace_id::text)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on order_notes for status changes
DROP TRIGGER IF EXISTS tr_order_notes_recompute_needs ON public.order_notes;
CREATE TRIGGER tr_order_notes_recompute_needs
  AFTER UPDATE OF status ON public.order_notes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trigger_recompute_procurement_needs();
