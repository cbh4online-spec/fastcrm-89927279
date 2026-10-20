DROP POLICY IF EXISTS "Authenticated users can read event_decision_matrix" ON public.event_decision_matrix;
CREATE POLICY "Authenticated users can read event_decision_matrix" ON public.event_decision_matrix
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can read seller tiers" ON public.c2c_seller_tiers;
CREATE POLICY "Anyone can read seller tiers" ON public.c2c_seller_tiers
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "c2c_categories_public_read" ON public.c2c_categories;
CREATE POLICY "c2c_categories_public_read" ON public.c2c_categories
FOR SELECT
USING (coalesce(is_active, true) = true OR public.is_workspace_member(auth.uid(), workspace_id));