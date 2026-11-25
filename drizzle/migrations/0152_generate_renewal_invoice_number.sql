CREATE OR REPLACE FUNCTION public.generate_renewal_invoice_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix TEXT := 'REN-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
  v_next INTEGER;
  v_number TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_workspace_id::text || ':' || v_prefix));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(substr(invoice_number, length(v_prefix) + 1), '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO v_next
  FROM public.invoices
  WHERE workspace_id = p_workspace_id AND invoice_number LIKE v_prefix || '%';
  LOOP
    v_number := v_prefix || LPAD(v_next::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invoices WHERE workspace_id = p_workspace_id AND invoice_number = v_number);
    v_next := v_next + 1;
  END LOOP;
  RETURN v_number;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_renewal_invoice_number(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_renewal_invoice_number(uuid) TO service_role;