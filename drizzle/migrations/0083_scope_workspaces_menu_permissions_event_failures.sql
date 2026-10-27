DROP POLICY IF EXISTS "Public can read workspace branding" ON public.workspaces;
CREATE POLICY "Public can read active workspace branding" ON public.workspaces
  FOR SELECT TO anon USING (status = 'active');

DROP POLICY IF EXISTS "Authenticated users can read menu permissions" ON public.menu_permissions;
CREATE POLICY "Users read menu permissions for their own roles" ON public.menu_permissions
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role::text = menu_permissions.role::text
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read event_runtime_failures" ON public.event_runtime_failures;
CREATE POLICY "Members read their workspace event failures" ON public.event_runtime_failures
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
  );