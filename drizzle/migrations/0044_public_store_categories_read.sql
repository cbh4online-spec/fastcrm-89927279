GRANT SELECT ON public.product_categories TO anon;
CREATE POLICY "Public can view store-visible categories"
ON public.product_categories FOR SELECT TO anon, authenticated
USING (is_active = true AND store_visible = true);