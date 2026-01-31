-- Create storage bucket for email builder images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-images', 
  'email-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Email images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload email images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their uploaded images
CREATE POLICY "Users can update email images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'email-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete email images
CREATE POLICY "Users can delete email images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'email-images' 
  AND auth.role() = 'authenticated'
);