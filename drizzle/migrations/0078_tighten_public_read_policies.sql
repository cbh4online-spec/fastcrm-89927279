DROP POLICY IF EXISTS "Anyone can read capture_types" ON public.capture_types;
CREATE POLICY "Signed-in users read capture types catalog" ON public.capture_types FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND key IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can view livestream messages" ON public.c2c_livestream_messages;
CREATE POLICY "View messages of existing livestreams" ON public.c2c_livestream_messages FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.c2c_livestreams l WHERE l.id = livestream_id AND l.status IN ('live','ended')));

DROP POLICY IF EXISTS "Anyone authenticated can view reviews" ON public.c2c_seller_reviews;
CREATE POLICY "View non-reported reviews or own/workspace" ON public.c2c_seller_reviews FOR SELECT TO authenticated
USING (coalesce(is_reported,false) = false OR buyer_id = auth.uid() OR public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));