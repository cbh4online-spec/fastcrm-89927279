
DROP POLICY IF EXISTS manage_field_perms_in_ws ON public.profile_field_permissions;
DROP POLICY IF EXISTS manage_menu_perms_in_ws ON public.profile_menu_permissions;

CREATE POLICY manage_field_perms_in_ws
  ON public.profile_field_permissions
  FOR ALL
  USING (
    public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  )
  WITH CHECK (
    public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );

CREATE POLICY manage_menu_perms_in_ws
  ON public.profile_menu_permissions
  FOR ALL
  USING (
    public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  )
  WITH CHECK (
    public.has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR public.has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );
