DROP POLICY IF EXISTS "postal cache readable by authenticated" ON public.pt_postal_code_cache;
CREATE POLICY "postal cache readable by workspace members" ON public.pt_postal_code_cache
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "kernel_actions_registry_select" ON public.kernel_actions_registry;
CREATE POLICY "kernel_actions_registry_select" ON public.kernel_actions_registry
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "c2c_reviews_public_read" ON public.c2c_reviews;
CREATE POLICY "c2c_reviews_public_read" ON public.c2c_reviews
FOR SELECT
USING (
  coalesce(is_hidden, false) = false
  OR reviewer_id = auth.uid()
  OR public.is_workspace_member(auth.uid(), workspace_id)
);