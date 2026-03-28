
-- Create ebook-assets storage bucket for covers and chapter images
INSERT INTO storage.buckets (id, name, public) VALUES ('ebook-assets', 'ebook-assets', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload ebook assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ebook-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update ebook assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ebook-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete ebook assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ebook-assets');

-- Allow public read access
CREATE POLICY "Public read access to ebook assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ebook-assets');
