-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public) VALUES ('store-category-images', 'store-category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "store_cat_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-category-images');

-- Allow authenticated users to upload
CREATE POLICY "store_cat_images_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-category-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "store_cat_images_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-category-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "store_cat_images_auth_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-category-images' AND auth.role() = 'authenticated');