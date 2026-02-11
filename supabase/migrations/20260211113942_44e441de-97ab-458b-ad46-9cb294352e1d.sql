
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload store assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can update store assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "Anyone can view store assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can delete store assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'store-assets');
