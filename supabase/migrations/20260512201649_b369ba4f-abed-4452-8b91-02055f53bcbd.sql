
ALTER TABLE public.leadchef_products ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('leadchef-products', 'leadchef-products', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "leadchef_products_public_read" ON storage.objects;
CREATE POLICY "leadchef_products_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'leadchef-products');

DROP POLICY IF EXISTS "leadchef_products_authed_write" ON storage.objects;
CREATE POLICY "leadchef_products_authed_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leadchef-products');

DROP POLICY IF EXISTS "leadchef_products_authed_update" ON storage.objects;
CREATE POLICY "leadchef_products_authed_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'leadchef-products');

DROP POLICY IF EXISTS "leadchef_products_authed_delete" ON storage.objects;
CREATE POLICY "leadchef_products_authed_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leadchef-products');
