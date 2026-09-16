DROP POLICY IF EXISTS workspace_managers_write_auto_price_settings ON public.store_auto_price_settings;
DROP POLICY IF EXISTS workspace_members_select_auto_price_settings ON public.store_auto_price_settings;

CREATE POLICY workspace_members_select_auto_price_settings
ON public.store_auto_price_settings
FOR SELECT
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY workspace_managers_write_auto_price_settings
ON public.store_auto_price_settings
FOR ALL
TO authenticated
USING (public.can_manage_workspace(auth.uid(), workspace_id))
WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id));