-- Activate marketplace-c2c in every existing workspace that does not already have it
INSERT INTO public.workspace_modules (
  workspace_id,
  module_id,
  status,
  subscribed_by,
  current_period_start
)
SELECT
  w.id,
  '0e13b213-5b7c-4acc-8c06-79f159c945b3'::uuid,
  'active',
  w.owner_id,
  now()
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_modules wm
  WHERE wm.workspace_id = w.id
    AND wm.module_id = '0e13b213-5b7c-4acc-8c06-79f159c945b3'::uuid
);

-- Make sure every new workspace also enables marketplace-c2c automatically
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

  -- Auto-enable Marketplace C2C for every new workspace
  INSERT INTO public.workspace_modules (workspace_id, module_id, status, subscribed_by, current_period_start)
  SELECT v_workspace_id, '0e13b213-5b7c-4acc-8c06-79f159c945b3', 'active', v_user_id, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_modules wm
    WHERE wm.workspace_id = v_workspace_id
      AND wm.module_id = '0e13b213-5b7c-4acc-8c06-79f159c945b3'
  );

  RETURN json_build_object(
    'id', v_workspace_id,
    'name', v_name,
    'slug', v_slug,
    'role', 'owner',
    'created_at', now()
  );
END;
$function$;