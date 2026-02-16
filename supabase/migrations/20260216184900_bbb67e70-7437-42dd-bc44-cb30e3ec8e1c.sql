
-- Create bio-assets bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bio-assets', 'bio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload bio assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bio-assets' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Public read access for bio assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'bio-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update bio assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bio-assets' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete bio assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'bio-assets' AND auth.role() = 'authenticated');
