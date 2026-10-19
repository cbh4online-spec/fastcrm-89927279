DROP POLICY IF EXISTS "Anyone can view livestream viewers" ON public.c2c_livestream_viewers;
CREATE POLICY "Viewers see own record or stream owners" ON public.c2c_livestream_viewers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.c2c_livestreams l WHERE l.id = livestream_id AND public.is_workspace_member(auth.uid(), l.workspace_id)));

DROP POLICY IF EXISTS "Anyone can read community settings by workspace" ON public.community_settings;
CREATE POLICY "Members read community settings" ON public.community_settings FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS exclusive_content_public_read ON public.exclusive_content;
CREATE POLICY exclusive_content_member_read ON public.exclusive_content FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));