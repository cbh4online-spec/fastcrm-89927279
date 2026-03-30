
CREATE OR REPLACE FUNCTION public.get_legal_page_content(page_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM admin_settings WHERE key = page_key AND key LIKE 'legal_page_%'
$$;
