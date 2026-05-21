
-- 1) Optional title for workspace_members (e.g. "CEO", "Sales Manager")
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS title TEXT;

-- 2) Create B2B workspace with owner + onboarding metadata, atomically
CREATE OR REPLACE FUNCTION public.create_workspace_b2b(
  p_name TEXT,
  p_slug TEXT,
  p_company_name TEXT DEFAULT NULL,
  p_tax_id TEXT DEFAULT NULL,
  p_team_size TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT NULL,
  p_primary_objective TEXT DEFAULT NULL,
  p_my_title TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_workspace_id UUID;
  v_slug TEXT;
  v_suffix INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  -- Ensure unique slug
  v_slug := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' THEN v_slug := 'workspace'; END IF;

  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_slug || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.workspaces (name, slug, owner_id, company_name, tax_id)
  VALUES (trim(p_name), v_slug, v_user_id, nullif(trim(p_company_name), ''), nullif(trim(p_tax_id), ''))
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, title)
  VALUES (v_workspace_id, v_user_id, 'owner', nullif(trim(p_my_title), ''));

  INSERT INTO public.workspace_onboarding (
    workspace_id, team_size, business_type, primary_objective, requires_onboarding
  ) VALUES (
    v_workspace_id,
    nullif(trim(p_team_size), ''),
    nullif(trim(p_business_type), ''),
    nullif(trim(p_primary_objective), ''),
    true
  )
  ON CONFLICT (workspace_id) DO UPDATE SET
    team_size = EXCLUDED.team_size,
    business_type = EXCLUDED.business_type,
    primary_objective = EXCLUDED.primary_objective,
    updated_at = now();

  RETURN jsonb_build_object(
    'id', v_workspace_id,
    'name', trim(p_name),
    'slug', v_slug,
    'role', 'owner'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace_b2b(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 3) List pending invites for the current authenticated user (matched by email)
CREATE OR REPLACE FUNCTION public.get_pending_invites_for_user()
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  workspace_name TEXT,
  role TEXT,
  invite_token UUID,
  expires_at TIMESTAMPTZ,
  invited_by_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(coalesce((auth.jwt() ->> 'email')::text, ''));
BEGIN
  IF v_email = '' THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    wi.id,
    wi.workspace_id,
    w.name AS workspace_name,
    wi.role,
    wi.invite_token,
    wi.expires_at,
    (SELECT au.email::text FROM auth.users au WHERE au.id = wi.invited_by) AS invited_by_email
  FROM public.workspace_invites wi
  JOIN public.workspaces w ON w.id = wi.workspace_id
  WHERE lower(wi.email) = v_email
    AND wi.status = 'pending'
    AND (wi.expires_at IS NULL OR wi.expires_at > now())
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = wi.workspace_id AND wm.user_id = auth.uid()
    )
  ORDER BY wi.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_invites_for_user() TO authenticated;

-- 4) Accept invite by token (validates email match)
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(coalesce((auth.jwt() ->> 'email')::text, ''));
  v_invite RECORD;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_invite
  FROM public.workspace_invites
  WHERE invite_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invite is not pending'; END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite has expired';
  END IF;
  IF lower(v_invite.email) <> v_email THEN
    RAISE EXCEPTION 'Invite email does not match current user';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, v_user_id, v_invite.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invites
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'workspace_id', v_invite.workspace_id,
    'role', v_invite.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(UUID) TO authenticated;
