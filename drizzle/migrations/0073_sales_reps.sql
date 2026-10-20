CREATE TABLE public.sales_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  code text CHECK (code IS NULL OR char_length(code) <= 40),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  email text CHECK (email IS NULL OR char_length(email) <= 200),
  zone text CHECK (zone IS NULL OR char_length(zone) <= 120),
  user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sales_reps_ws_code_uidx ON public.sales_reps(workspace_id, lower(code)) WHERE code IS NOT NULL;
CREATE INDEX sales_reps_ws_idx ON public.sales_reps(workspace_id, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_reps TO authenticated;
GRANT ALL ON public.sales_reps TO service_role;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_reps_select ON public.sales_reps FOR SELECT TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sales_reps_insert ON public.sales_reps FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sales_reps_update ON public.sales_reps FOR UPDATE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id)) WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY sales_reps_delete ON public.sales_reps FOR DELETE TO authenticated USING (public.is_workspace_member(auth.uid(), workspace_id));

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS companies_sales_rep_idx ON public.companies(sales_rep_id) WHERE sales_rep_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_sales_rep_idx ON public.contacts(sales_rep_id) WHERE sales_rep_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sales_rep_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rep_ws uuid;
BEGIN
  IF TG_TABLE_NAME = 'contacts' AND NEW.sales_rep_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT sales_rep_id INTO NEW.sales_rep_id FROM public.companies WHERE id = NEW.company_id;
  END IF;
  IF NEW.sales_rep_id IS NOT NULL THEN
    SELECT workspace_id INTO rep_ws FROM public.sales_reps WHERE id = NEW.sales_rep_id;
    IF rep_ws IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION 'Vendedor não pertence a este espaço de trabalho';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER companies_sales_rep_guard BEFORE INSERT OR UPDATE OF sales_rep_id ON public.companies FOR EACH ROW EXECUTE FUNCTION public.sales_rep_guard();
CREATE TRIGGER contacts_sales_rep_guard BEFORE INSERT OR UPDATE OF sales_rep_id, company_id ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.sales_rep_guard();