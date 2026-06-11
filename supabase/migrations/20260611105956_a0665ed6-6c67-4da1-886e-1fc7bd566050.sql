
DROP POLICY IF EXISTS anon_insert_sessions ON public.checkout_sessions;
CREATE POLICY anon_insert_sessions ON public.checkout_sessions
  FOR INSERT TO anon
  WITH CHECK (workspace_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can create store orders" ON public.store_orders;
CREATE POLICY "Anyone can create store orders" ON public.store_orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (workspace_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can create offers" ON public.store_offers;
CREATE POLICY "Anyone can create offers" ON public.store_offers
  FOR INSERT TO anon, authenticated
  WITH CHECK (workspace_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert consent" ON public.gdpr_consents;
CREATE POLICY "Anyone can insert consent" ON public.gdpr_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (visitor_id IS NOT NULL AND length(trim(visitor_id)) > 0)
    OR user_id IS NOT NULL
  );

DROP POLICY IF EXISTS product_external_prices_public_read ON public.product_external_prices;
CREATE POLICY product_external_prices_workspace_read ON public.product_external_prices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = product_external_prices.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Workspace members can view sellers" ON public.c2c_sellers;
CREATE POLICY "Workspace admins can view sellers" ON public.c2c_sellers
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role])
    )
  );

DROP POLICY IF EXISTS "Workspace members manage transactions" ON public.c2c_transactions;
CREATE POLICY "Workspace admins manage transactions" ON public.c2c_transactions
  FOR ALL TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role])
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role])
    )
  );
