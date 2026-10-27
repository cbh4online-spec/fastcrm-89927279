DROP POLICY IF EXISTS "Anyone authenticated can view endorsements" ON public.c2c_seller_endorsements;
CREATE POLICY "Endorsements visible to participants and workspace"
ON public.c2c_seller_endorsements FOR SELECT TO authenticated
USING (
  endorser_id = auth.uid()
  OR seller_id = auth.uid()
  OR (workspace_id IS NOT NULL AND workspace_id IN (SELECT public.get_user_workspace_ids()))
  OR (SELECT public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS kernel_entity_registry_read ON public.kernel_entity_registry;
CREATE POLICY kernel_entity_registry_read
ON public.kernel_entity_registry FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
  OR (SELECT public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS loyalty_rewards_public_read ON public.loyalty_rewards;
CREATE POLICY loyalty_rewards_public_read
ON public.loyalty_rewards FOR SELECT TO anon, authenticated
USING (
  is_active = true
  OR (auth.uid() IS NOT NULL AND workspace_id IN (SELECT public.get_user_workspace_ids()))
);