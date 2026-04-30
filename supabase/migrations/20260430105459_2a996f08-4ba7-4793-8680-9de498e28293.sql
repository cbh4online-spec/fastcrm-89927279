-- Fix RLS policies on profile_field_permissions: argument order was inverted
-- is_workspace_member signature is (_user_id, _workspace_id) but policies passed (workspace_id, user_id)

DROP POLICY IF EXISTS view_field_perms_in_ws ON public.profile_field_permissions;
DROP POLICY IF EXISTS manage_field_perms_in_ws ON public.profile_field_permissions;

CREATE POLICY view_field_perms_in_ws
  ON public.profile_field_permissions
  FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY manage_field_perms_in_ws
  ON public.profile_field_permissions
  FOR ALL
  USING (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::workspace_role)
  )
  WITH CHECK (
    public.has_workspace_role(workspace_id, auth.uid(), 'owner'::workspace_role)
    OR public.has_workspace_role(workspace_id, auth.uid(), 'admin'::workspace_role)
  );

-- Apply same fix to profile_menu_permissions if it has the same issue
DO $$
DECLARE
  pol_def text;
BEGIN
  SELECT pg_get_expr(polqual, polrelid) INTO pol_def
  FROM pg_policy
  WHERE polrelid = 'public.profile_menu_permissions'::regclass
    AND polname = 'view_menu_perms_in_ws'
  LIMIT 1;

  IF pol_def IS NOT NULL AND pol_def LIKE '%is_workspace_member(workspace_id, auth.uid())%' THEN
    EXECUTE 'DROP POLICY IF EXISTS view_menu_perms_in_ws ON public.profile_menu_permissions';
    EXECUTE 'CREATE POLICY view_menu_perms_in_ws ON public.profile_menu_permissions FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id))';
  END IF;
END $$;
