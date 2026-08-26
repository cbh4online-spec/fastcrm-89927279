-- 1) Helper: slug único, sem acentos
CREATE OR REPLACE FUNCTION public.generate_unique_workspace_slug(p_source text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
  v_slug text;
  v_suffix int := 0;
BEGIN
  v_base := lower(coalesce(p_source, ''));
  -- remover acentos
  v_base := translate(v_base,
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn');
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  IF v_base = '' THEN
    v_base := 'workspace';
  END IF;
  v_base := left(v_base, 50);

  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.workspaces w WHERE w.slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix::text;
  END LOOP;

  RETURN v_slug;
END;
$function$;

-- 2) Criação a partir da app (barra lateral)
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(p_name text, p_slug text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'WORKSPACE_NAME_REQUIRED';
  END IF;

  v_slug := public.generate_unique_workspace_slug(coalesce(nullif(trim(coalesce(p_slug,'')), ''), v_name));

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (v_name, v_slug, v_user_id)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  INSERT INTO public.workspace_subscriptions (workspace_id, plan, status)
  VALUES (v_workspace_id, 'free'::public.subscription_plan, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspace_onboarding (workspace_id, requires_onboarding)
  VALUES (v_workspace_id, true)
  ON CONFLICT (workspace_id) DO NOTHING;

  RETURN json_build_object(
    'id', v_workspace_id,
    'name', v_name,
    'slug', v_slug,
    'role', 'owner',
    'created_at', now()
  );
END;
$function$;

-- 3) Criação no onboarding B2B
CREATE OR REPLACE FUNCTION public.create_workspace_b2b(p_name text, p_slug text DEFAULT NULL::text, p_company_name text DEFAULT NULL::text, p_tax_id text DEFAULT NULL::text, p_team_size text DEFAULT NULL::text, p_business_type text DEFAULT NULL::text, p_primary_objective text DEFAULT NULL::text, p_my_title text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'WORKSPACE_NAME_REQUIRED';
  END IF;

  v_slug := public.generate_unique_workspace_slug(coalesce(nullif(trim(coalesce(p_slug,'')), ''), v_name));

  INSERT INTO public.workspaces (name, slug, owner_id, company_name, tax_id)
  VALUES (v_name, v_slug, v_user_id, nullif(trim(coalesce(p_company_name,'')), ''), nullif(trim(coalesce(p_tax_id,'')), ''))
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, title)
  VALUES (v_workspace_id, v_user_id, 'owner', nullif(trim(coalesce(p_my_title,'')), ''));

  INSERT INTO public.workspace_subscriptions (workspace_id, plan, status)
  VALUES (v_workspace_id, 'free'::public.subscription_plan, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspace_onboarding (
    workspace_id, team_size, business_type, primary_objective, requires_onboarding
  ) VALUES (
    v_workspace_id,
    nullif(trim(coalesce(p_team_size,'')), ''),
    nullif(trim(coalesce(p_business_type,'')), ''),
    nullif(trim(coalesce(p_primary_objective,'')), ''),
    true
  )
  ON CONFLICT (workspace_id) DO UPDATE SET
    team_size = EXCLUDED.team_size,
    business_type = EXCLUDED.business_type,
    primary_objective = EXCLUDED.primary_objective,
    updated_at = now();

  RETURN jsonb_build_object(
    'id', v_workspace_id,
    'name', v_name,
    'slug', v_slug,
    'role', 'owner'
  );
END;
$function$;

-- 4) Criação pelo super admin (corrige coluna inexistente created_by)
CREATE OR REPLACE FUNCTION public.create_workspace_for_user(p_name text, p_slug text, p_owner_user_id uuid, p_plan text DEFAULT 'free'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_slug text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can create workspaces for other users';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'WORKSPACE_NAME_REQUIRED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_owner_user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_owner_user_id;
  END IF;

  v_slug := public.generate_unique_workspace_slug(coalesce(nullif(trim(coalesce(p_slug,'')), ''), v_name));

  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (v_name, v_slug, p_owner_user_id)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_owner_user_id, 'owner');

  INSERT INTO public.workspace_subscriptions (workspace_id, plan, status)
  VALUES (v_workspace_id, p_plan::public.subscription_plan, 'active')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspace_onboarding (workspace_id, requires_onboarding)
  VALUES (v_workspace_id, true)
  ON CONFLICT (workspace_id) DO NOTHING;

  PERFORM public.log_admin_action(
    'workspace_created',
    'workspace',
    v_workspace_id::TEXT,
    v_workspace_id,
    jsonb_build_object('name', v_name, 'slug', v_slug, 'owner_user_id', p_owner_user_id, 'plan', p_plan)
  );

  RETURN json_build_object(
    'id', v_workspace_id,
    'name', v_name,
    'slug', v_slug,
    'owner_user_id', p_owner_user_id,
    'plan', p_plan,
    'created_at', now()
  );
END;
$function$;