DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;
CREATE POLICY "Members can insert workspace notifications" ON public.admin_notifications
FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Anyone can view channel defaults" ON public.channel_defaults;
CREATE POLICY "Authenticated can view channel defaults" ON public.channel_defaults
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);