DROP POLICY IF EXISTS "product_price_history_admin_insert" ON public.product_price_history;
CREATE POLICY "product_price_history_workspace_insert"
ON public.product_price_history
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = product_price_history.workspace_id
      AND wm.user_id = auth.uid()
  )
);