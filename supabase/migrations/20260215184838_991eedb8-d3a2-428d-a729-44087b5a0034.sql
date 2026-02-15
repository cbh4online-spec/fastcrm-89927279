
-- Fix 1: Restrict email_connections SELECT to admin/owner only
DROP POLICY IF EXISTS "Users can view email connections in their workspace" ON public.email_connections;

CREATE POLICY "Admins can view email connections"
  ON public.email_connections FOR SELECT
  USING (public.is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Fix 2: Add authorization checks to SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.get_workspace_usage_counts(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is workspace member
  IF NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Permission denied: not a workspace member';
  END IF;

  SELECT jsonb_build_object(
    'leads', (SELECT COUNT(*) FROM public.leads WHERE workspace_id = p_workspace_id),
    'contacts', (SELECT COUNT(*) FROM public.contacts WHERE workspace_id = p_workspace_id),
    'opportunities', (SELECT COUNT(*) FROM public.opportunities WHERE workspace_id = p_workspace_id),
    'automations', (SELECT COUNT(*) FROM public.automation_rules WHERE workspace_id = p_workspace_id),
    'pipelines', (SELECT COUNT(*) FROM public.pipelines WHERE workspace_id = p_workspace_id),
    'products', (SELECT COUNT(*) FROM public.products WHERE workspace_id = p_workspace_id),
    'email_templates', (SELECT COUNT(*) FROM public.email_templates WHERE workspace_id = p_workspace_id),
    'custom_fields', (SELECT COUNT(*) FROM public.custom_fields WHERE workspace_id = p_workspace_id),
    'members', (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = p_workspace_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_workspace_quota(p_workspace_id UUID, p_resource_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
  v_limit INTEGER;
  v_current INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Verify caller is workspace member
  IF NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Permission denied: not a workspace member';
  END IF;

  SELECT ws.plan_id INTO v_plan_id
  FROM public.workspace_subscriptions ws
  WHERE ws.workspace_id = p_workspace_id AND ws.status = 'active'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', 0, 'reason', 'No active plan - defaults allowed');
  END IF;

  SELECT (limits->>p_resource_type)::INTEGER INTO v_limit
  FROM public.subscription_plans
  WHERE id = v_plan_id;

  IF v_limit IS NULL OR v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'limit', -1, 'current', 0);
  END IF;

  EXECUTE format(
    'SELECT COUNT(*) FROM public.%I WHERE workspace_id = $1',
    p_resource_type
  ) INTO v_current USING p_workspace_id;

  v_allowed := v_current < v_limit;

  RETURN jsonb_build_object('allowed', v_allowed, 'limit', v_limit, 'current', v_current);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_workspace_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Verify caller is workspace member
  IF NOT public.is_workspace_member(auth.uid(), p_workspace_id) THEN
    RAISE EXCEPTION 'Permission denied: not a workspace member';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_subscriptions ws
    JOIN public.subscription_plans sp ON sp.id = ws.plan_id
    WHERE ws.workspace_id = p_workspace_id
      AND ws.status = 'active'
      AND sp.features ? p_feature_key
  ) INTO v_enabled;

  RETURN COALESCE(v_enabled, false);
END;
$$;

-- Fix 3: Make note-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'note-attachments';

-- Replace public policy with workspace-scoped policy
DROP POLICY IF EXISTS "Note attachments are publicly accessible" ON storage.objects;

CREATE POLICY "Members can view note attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'note-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT wm.workspace_id::text
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );
