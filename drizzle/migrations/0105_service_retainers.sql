CREATE TABLE public.service_retainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.renewal_contracts(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  included_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (included_hours >= 0),
  overage_hourly_rate numeric(10,2) NOT NULL DEFAULT 0 CHECK (overage_hourly_rate >= 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 4000),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_retainers TO authenticated;
GRANT ALL ON public.service_retainers TO service_role;
ALTER TABLE public.service_retainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read retainers" ON public.service_retainers FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin(auth.uid())));
CREATE POLICY "members insert retainers" ON public.service_retainers FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin(auth.uid())));
CREATE POLICY "members update retainers" ON public.service_retainers FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin(auth.uid())))
  WITH CHECK (workspace_id IN (SELECT get_user_workspace_ids()) OR (SELECT is_super_admin(auth.uid())));
CREATE POLICY "admins delete retainers" ON public.service_retainers FOR DELETE TO authenticated
  USING (public.can_manage_workspace(auth.uid(), workspace_id) OR (SELECT is_super_admin(auth.uid())));
CREATE INDEX idx_service_retainers_ws ON public.service_retainers(workspace_id, status);
CREATE TRIGGER trg_service_retainers_updated BEFORE UPDATE ON public.service_retainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.implementation_projects ADD COLUMN retainer_id uuid REFERENCES public.service_retainers(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN retainer_id uuid REFERENCES public.service_retainers(id) ON DELETE SET NULL;
ALTER TABLE public.implementation_time_entries ADD COLUMN retainer_id uuid REFERENCES public.service_retainers(id) ON DELETE SET NULL;
ALTER TABLE public.support_ticket_time_entries ADD COLUMN retainer_id uuid REFERENCES public.service_retainers(id) ON DELETE SET NULL;
CREATE INDEX idx_impl_time_retainer ON public.implementation_time_entries(retainer_id, entry_date);
CREATE INDEX idx_ticket_time_retainer ON public.support_ticket_time_entries(retainer_id, created_at);

CREATE OR REPLACE FUNCTION public.retainer_time_entry_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent_ret uuid; ret_ws uuid;
BEGIN
  IF TG_TABLE_NAME = 'implementation_time_entries' THEN
    SELECT retainer_id INTO parent_ret FROM implementation_projects WHERE id = NEW.project_id;
    IF NEW.workspace_id IS NULL THEN
      SELECT workspace_id INTO NEW.workspace_id FROM implementation_projects WHERE id = NEW.project_id;
    END IF;
  ELSE
    SELECT retainer_id INTO parent_ret FROM support_tickets WHERE id = NEW.ticket_id;
  END IF;
  IF NEW.retainer_id IS NULL AND TG_OP = 'INSERT' THEN NEW.retainer_id := parent_ret; END IF;
  IF NEW.retainer_id IS NOT NULL THEN
    SELECT workspace_id INTO ret_ws FROM service_retainers WHERE id = NEW.retainer_id;
    IF ret_ws IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION 'Avença de outro espaço de trabalho';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_impl_time_retainer BEFORE INSERT OR UPDATE ON public.implementation_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.retainer_time_entry_guard();
CREATE TRIGGER trg_ticket_time_retainer BEFORE INSERT OR UPDATE ON public.support_ticket_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.retainer_time_entry_guard();

CREATE OR REPLACE FUNCTION public.retainer_parent_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ret_ws uuid;
BEGIN
  IF NEW.retainer_id IS NOT NULL THEN
    SELECT workspace_id INTO ret_ws FROM service_retainers WHERE id = NEW.retainer_id;
    IF ret_ws IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION 'Avença de outro espaço de trabalho';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_impl_project_retainer BEFORE INSERT OR UPDATE OF retainer_id ON public.implementation_projects
  FOR EACH ROW EXECUTE FUNCTION public.retainer_parent_guard();
CREATE TRIGGER trg_ticket_retainer BEFORE INSERT OR UPDATE OF retainer_id ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.retainer_parent_guard();