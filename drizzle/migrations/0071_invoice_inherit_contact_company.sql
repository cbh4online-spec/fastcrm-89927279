CREATE OR REPLACE FUNCTION public.invoice_inherit_contact_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.contact_id IS NOT NULL THEN
    SELECT c.company_id INTO NEW.company_id FROM public.contacts c
    WHERE c.id = NEW.contact_id AND c.workspace_id = NEW.workspace_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_invoice_inherit_contact_company ON public.invoices;
CREATE TRIGGER trg_invoice_inherit_contact_company BEFORE INSERT OR UPDATE OF contact_id, company_id ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.invoice_inherit_contact_company();