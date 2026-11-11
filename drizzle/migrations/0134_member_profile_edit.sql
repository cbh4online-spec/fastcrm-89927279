ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.update_workspace_member_profile(_member_id uuid, _full_name text, _email text, _phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; v_email text; v_name text; v_phone text;
BEGIN
  SELECT * INTO m FROM public.workspace_members WHERE id = _member_id;
  IF m IS NULL THEN RAISE EXCEPTION 'member_not_found'; END IF;
  IF NOT (public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.workspace_members c WHERE c.workspace_id = m.workspace_id
      AND c.user_id = auth.uid() AND c.role IN ('owner','admin','agency'))) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;
  IF m.role = 'owner' AND NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'cannot_edit_owner'; END IF;
  v_name := nullif(btrim(coalesce(_full_name,'')),'');
  v_email := nullif(lower(btrim(coalesce(_email,''))),'');
  v_phone := nullif(btrim(coalesce(_phone,'')),'');
  IF v_name IS NULL OR length(v_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 255 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN RAISE EXCEPTION 'invalid_email'; END IF;
  IF v_phone IS NOT NULL AND v_phone !~ '^\+?[0-9 ()\-]{6,25}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  IF v_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = v_email AND user_id <> m.user_id) THEN
    RAISE EXCEPTION 'email_in_use';
  END IF;
  INSERT INTO public.profiles (user_id, full_name, email, phone) VALUES (m.user_id, v_name, v_email, v_phone)
  ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now();
END $$;

REVOKE ALL ON FUNCTION public.update_workspace_member_profile(uuid,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_workspace_member_profile(uuid,text,text,text) TO authenticated;