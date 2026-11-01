CREATE OR REPLACE FUNCTION public.retainer_cascade_to_time_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.retainer_id IS NOT DISTINCT FROM OLD.retainer_id THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'implementation_projects' THEN
    UPDATE implementation_time_entries SET retainer_id = NEW.retainer_id
     WHERE project_id = NEW.id AND retainer_id IS NOT DISTINCT FROM OLD.retainer_id;
  ELSE
    UPDATE support_ticket_time_entries SET retainer_id = NEW.retainer_id
     WHERE ticket_id = NEW.id AND retainer_id IS NOT DISTINCT FROM OLD.retainer_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_impl_project_retainer_cascade AFTER UPDATE OF retainer_id ON public.implementation_projects
  FOR EACH ROW EXECUTE FUNCTION public.retainer_cascade_to_time_entries();
CREATE TRIGGER trg_ticket_retainer_cascade AFTER UPDATE OF retainer_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.retainer_cascade_to_time_entries();

CREATE OR REPLACE FUNCTION public.service_retainer_company_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM companies WHERE id = NEW.company_id AND workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'A empresa não pertence a este espaço de trabalho';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_service_retainer_company_guard BEFORE INSERT OR UPDATE OF company_id, workspace_id ON public.service_retainers
  FOR EACH ROW EXECUTE FUNCTION public.service_retainer_company_guard();