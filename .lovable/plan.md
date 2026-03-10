

# Fix: Product creation blocked by RLS on `product_price_history`

## Problem
The `product_price_history` table's INSERT policy only checks workspace membership — it has no super_admin bypass. When a super_admin creates a product (which triggers a price history insert), it fails if they're not explicitly a member of that workspace.

## Solution
Update the RLS INSERT policy on `product_price_history` to include `OR public.is_super_admin(auth.uid())`, matching the pattern used across other tables.

### SQL Migration
```sql
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
```

Also verify the `products` table INSERT policy has the same super_admin bypass — if not, fix it too.

