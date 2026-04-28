-- Fix: allow any workspace member (and super admins) to insert price history rows.
-- The previous policy required 'owner' or 'admin' role, which blocked product creation
-- for members whose roles do not include those, and also blocked super admins.

DROP POLICY IF EXISTS "product_price_history_admin_insert" ON public.product_price_history;
DROP POLICY IF EXISTS "product_price_history_workspace_insert" ON public.product_price_history;

CREATE POLICY "product_price_history_workspace_insert"
ON public.product_price_history
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = product_price_history.workspace_id
      AND wm.user_id = auth.uid()
  )
);