ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS supplier_purchase_total numeric, ADD COLUMN IF NOT EXISTS supplier_last_invoice_date date;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS supplier_purchase_total numeric, ADD COLUMN IF NOT EXISTS supplier_last_invoice_date date;

CREATE OR REPLACE FUNCTION public.refresh_supplier_purchase_total(_workspace uuid, _company uuid, _contact uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; tot numeric; last_d date;
BEGIN
  FOR r IN SELECT rl.entity_type, rl.source_id, rl.target_id FROM public.workspace_record_links rl
    JOIN public.workspace_supply_links l ON l.id = rl.link_id AND l.supplier_workspace_id = _workspace AND l.active AND l.sync_crm
    WHERE (rl.entity_type = 'company' AND rl.source_id = _company) OR (rl.entity_type = 'contact' AND rl.source_id = _contact) LOOP
    IF r.entity_type = 'company' THEN
      SELECT COALESCE(sum(amount_paid),0), max(issue_date) INTO tot, last_d FROM public.invoices
        WHERE workspace_id = _workspace AND company_id = r.source_id AND COALESCE(status,'') NOT IN ('draft','cancelled','voided');
      UPDATE public.companies SET supplier_purchase_total = tot, supplier_last_invoice_date = last_d WHERE id = r.target_id;
    ELSE
      SELECT COALESCE(sum(amount_paid),0), max(issue_date) INTO tot, last_d FROM public.invoices
        WHERE workspace_id = _workspace AND contact_id = r.source_id AND COALESCE(status,'') NOT IN ('draft','cancelled','voided');
      UPDATE public.contacts SET supplier_purchase_total = tot, supplier_last_invoice_date = last_d WHERE id = r.target_id;
    END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_supplier_purchase_total(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_invoice_supplier_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.refresh_supplier_purchase_total(NEW.workspace_id, NEW.company_id, NEW.contact_id);
  IF TG_OP = 'UPDATE' AND (OLD.company_id IS DISTINCT FROM NEW.company_id OR OLD.contact_id IS DISTINCT FROM NEW.contact_id) THEN
    PERFORM public.refresh_supplier_purchase_total(OLD.workspace_id, OLD.company_id, OLD.contact_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'supplier total falhou: %', SQLSTATE; RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.trg_invoice_supplier_total() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_invoices_supplier_total AFTER INSERT OR UPDATE OF amount_paid, status, company_id, contact_id ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_supplier_total();