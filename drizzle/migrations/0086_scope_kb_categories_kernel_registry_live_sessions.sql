DROP POLICY IF EXISTS "authenticated users can read categories" ON public.kb_categories;
CREATE POLICY "workspace members can read categories" ON public.kb_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = (SELECT auth.uid()))
    OR (SELECT public.is_super_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "kernel_event_registry_read" ON public.kernel_event_registry;
CREATE POLICY "kernel_event_registry_read" ON public.kernel_event_registry
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = (SELECT auth.uid()))
    OR (SELECT public.is_super_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "live_sessions_select_public" ON public.live_sessions;
CREATE POLICY "live_sessions_select_public" ON public.live_sessions
  FOR SELECT TO public
  USING (status IN ('scheduled', 'live', 'ended'));
CREATE POLICY "live_sessions_select_members" ON public.live_sessions
  FOR SELECT TO authenticated
  USING (
    seller_id = (SELECT auth.uid())
    OR workspace_id IN (SELECT public.get_user_workspace_ids())
    OR (SELECT public.is_super_admin(auth.uid()))
  );