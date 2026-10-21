CREATE OR REPLACE FUNCTION public.companies_sales_rep_guard_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rep_ws uuid;
BEGIN
  IF NEW.sales_rep_id IS NOT NULL THEN
    SELECT workspace_id INTO rep_ws FROM public.sales_reps WHERE id = NEW.sales_rep_id;
    IF rep_ws IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION 'Vendedor não pertence a este espaço de trabalho';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.contacts_sales_rep_guard_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rep_ws uuid;
BEGIN
  IF NEW.sales_rep_id IS NULL AND NEW.company_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
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

DROP TRIGGER IF EXISTS companies_sales_rep_guard ON public.companies;
CREATE TRIGGER companies_sales_rep_guard BEFORE INSERT OR UPDATE OF sales_rep_id ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_sales_rep_guard_fn();

DROP TRIGGER IF EXISTS contacts_sales_rep_guard ON public.contacts;
CREATE TRIGGER contacts_sales_rep_guard BEFORE INSERT OR UPDATE OF sales_rep_id, company_id ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.contacts_sales_rep_guard_fn();