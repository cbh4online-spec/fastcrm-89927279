ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sales_function text;

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_profiles_sales_function()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sales_function IS NOT NULL AND NEW.sales_function NOT IN ('vendedor', 'gestor', 'diretor', 'ceo') THEN
    RAISE EXCEPTION 'Invalid sales_function: %. Must be one of: vendedor, gestor, diretor, ceo', NEW.sales_function;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profiles_sales_function ON public.profiles;
CREATE TRIGGER trg_validate_profiles_sales_function
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profiles_sales_function();