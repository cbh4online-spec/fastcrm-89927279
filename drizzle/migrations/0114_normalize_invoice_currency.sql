CREATE OR REPLACE FUNCTION public.normalize_invoice_currency()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.currency := upper(trim(coalesce(NEW.currency, '')));
  IF NEW.currency IN ('', 'EURO', 'EUROS', '€') THEN
    NEW.currency := 'EUR';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_invoice_currency ON public.invoices;
CREATE TRIGGER trg_normalize_invoice_currency
BEFORE INSERT OR UPDATE OF currency ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.normalize_invoice_currency();

UPDATE public.invoices SET currency = 'EUR' WHERE currency IN ('Euro', 'Euros', '€', 'euro');