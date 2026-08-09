CREATE POLICY "product_bundles_public_read_active"
ON public.product_bundles
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "product_bundle_items_public_read_active"
ON public.product_bundle_items
FOR SELECT
TO anon, authenticated
USING (
  bundle_id IN (SELECT pb.id FROM public.product_bundles pb WHERE pb.is_active = true)
);

GRANT SELECT ON public.product_bundles TO anon, authenticated;
GRANT SELECT ON public.product_bundle_items TO anon, authenticated;