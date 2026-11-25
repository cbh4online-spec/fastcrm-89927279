CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  v_next INTEGER;
  v_number TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_workspace_id::text || ':' || v_year));

  SELECT COALESCE(MAX(NULLIF(regexp_replace(substr(invoice_number, length('FT' || v_year || '/') + 1), '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO v_next
  FROM public.invoices
  WHERE workspace_id = p_workspace_id
    AND invoice_number LIKE 'FT' || v_year || '/%';

  LOOP
    v_number := 'FT' || v_year || '/' || LPAD(v_next::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.invoices WHERE workspace_id = p_workspace_id AND invoice_number = v_number
    );
    v_next := v_next + 1;
  END LOOP;

  RETURN v_number;
END;
$$;