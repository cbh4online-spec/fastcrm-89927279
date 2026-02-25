
CREATE OR REPLACE FUNCTION public.fn_notify_lifecycle_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage THEN
    INSERT INTO public.admin_notifications (workspace_id, type, title, message, metadata)
    VALUES (
      NEW.workspace_id,
      'lifecycle_transition',
      COALESCE(NEW.name, NEW.email, 'Contacto') || ' → ' || NEW.lifecycle_stage,
      OLD.lifecycle_stage || ' → ' || NEW.lifecycle_stage,
      jsonb_build_object('contact_id', NEW.id, 'old_stage', OLD.lifecycle_stage, 'new_stage', NEW.lifecycle_stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_lifecycle ON public.contacts;
CREATE TRIGGER trg_notify_lifecycle
  AFTER UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_lifecycle_transition();
