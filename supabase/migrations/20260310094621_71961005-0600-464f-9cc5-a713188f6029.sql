
-- Drop and recreate all RLS policies for product settings tables to include super_admin access

-- ============ PRODUCT_TYPES ============
DROP POLICY IF EXISTS "Users can view product types in their workspace" ON public.product_types;
DROP POLICY IF EXISTS "Users can insert product types in their workspace" ON public.product_types;
DROP POLICY IF EXISTS "Users can update product types in their workspace" ON public.product_types;
DROP POLICY IF EXISTS "Users can delete non-system product types in their workspace" ON public.product_types;

CREATE POLICY "Users can view product types in their workspace" ON public.product_types FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert product types in their workspace" ON public.product_types FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update product types in their workspace" ON public.product_types FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete non-system product types in their workspace" ON public.product_types FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);

-- ============ BILLING_TYPES ============
DROP POLICY IF EXISTS "Users can view billing types in their workspace" ON public.billing_types;
DROP POLICY IF EXISTS "Users can insert billing types in their workspace" ON public.billing_types;
DROP POLICY IF EXISTS "Users can update billing types in their workspace" ON public.billing_types;
DROP POLICY IF EXISTS "Users can delete non-system billing types in their workspace" ON public.billing_types;

CREATE POLICY "Users can view billing types in their workspace" ON public.billing_types FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert billing types in their workspace" ON public.billing_types FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update billing types in their workspace" ON public.billing_types FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete non-system billing types in their workspace" ON public.billing_types FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);

-- ============ PAYMENT_CONDITIONS ============
DROP POLICY IF EXISTS "Users can view payment_conditions in their workspace" ON public.payment_conditions;
DROP POLICY IF EXISTS "Users can insert payment_conditions in their workspace" ON public.payment_conditions;
DROP POLICY IF EXISTS "Users can update payment_conditions in their workspace" ON public.payment_conditions;
DROP POLICY IF EXISTS "Users can delete payment_conditions in their workspace" ON public.payment_conditions;

CREATE POLICY "Users can view payment_conditions in their workspace" ON public.payment_conditions FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert payment_conditions in their workspace" ON public.payment_conditions FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update payment_conditions in their workspace" ON public.payment_conditions FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete payment_conditions in their workspace" ON public.payment_conditions FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);

-- ============ PAYMENT_METHODS ============
DROP POLICY IF EXISTS "Users can view payment_methods in their workspace" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can insert payment_methods in their workspace" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update payment_methods in their workspace" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can delete payment_methods in their workspace" ON public.payment_methods;

CREATE POLICY "Users can view payment_methods in their workspace" ON public.payment_methods FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert payment_methods in their workspace" ON public.payment_methods FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update payment_methods in their workspace" ON public.payment_methods FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete payment_methods in their workspace" ON public.payment_methods FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);

-- ============ CONSUMPTION_MODELS ============
DROP POLICY IF EXISTS "Users can view consumption_models in their workspace" ON public.consumption_models;
DROP POLICY IF EXISTS "Users can insert consumption_models in their workspace" ON public.consumption_models;
DROP POLICY IF EXISTS "Users can update consumption_models in their workspace" ON public.consumption_models;
DROP POLICY IF EXISTS "Users can delete consumption_models in their workspace" ON public.consumption_models;

CREATE POLICY "Users can view consumption_models in their workspace" ON public.consumption_models FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert consumption_models in their workspace" ON public.consumption_models FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update consumption_models in their workspace" ON public.consumption_models FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete consumption_models in their workspace" ON public.consumption_models FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);

-- ============ DELIVERY_MODES ============
DROP POLICY IF EXISTS "Users can view delivery_modes in their workspace" ON public.delivery_modes;
DROP POLICY IF EXISTS "Users can insert delivery_modes in their workspace" ON public.delivery_modes;
DROP POLICY IF EXISTS "Users can update delivery_modes in their workspace" ON public.delivery_modes;
DROP POLICY IF EXISTS "Users can delete delivery_modes in their workspace" ON public.delivery_modes;

CREATE POLICY "Users can view delivery_modes in their workspace" ON public.delivery_modes FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert delivery_modes in their workspace" ON public.delivery_modes FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update delivery_modes in their workspace" ON public.delivery_modes FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete delivery_modes in their workspace" ON public.delivery_modes FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);

-- ============ BILLING_FREQUENCIES ============
DROP POLICY IF EXISTS "Users can view billing_frequencies in their workspace" ON public.billing_frequencies;
DROP POLICY IF EXISTS "Users can insert billing_frequencies in their workspace" ON public.billing_frequencies;
DROP POLICY IF EXISTS "Users can update billing_frequencies in their workspace" ON public.billing_frequencies;
DROP POLICY IF EXISTS "Users can delete billing_frequencies in their workspace" ON public.billing_frequencies;

CREATE POLICY "Users can view billing_frequencies in their workspace" ON public.billing_frequencies FOR SELECT TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can insert billing_frequencies in their workspace" ON public.billing_frequencies FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can update billing_frequencies in their workspace" ON public.billing_frequencies FOR UPDATE TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR is_super_admin()
);
CREATE POLICY "Users can delete billing_frequencies in their workspace" ON public.billing_frequencies FOR DELETE TO authenticated
USING (
  (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()) OR is_super_admin())
  AND is_system = false
);
