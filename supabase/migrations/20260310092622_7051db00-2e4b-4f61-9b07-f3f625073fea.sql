
-- Fix product_price_history INSERT policy to include super_admin bypass
DROP POLICY IF EXISTS "product_price_history_workspace_insert" ON public.product_price_history;

CREATE POLICY "product_price_history_workspace_insert"
ON public.product_price_history
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = product_price_history.workspace_id
      AND wm.user_id = auth.uid()
  )
);
