
-- Create landing-assets bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-assets', 'landing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read landing-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'landing-assets');

-- Allow authenticated users to upload
CREATE POLICY "Auth upload landing-assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'landing-assets');

-- Allow authenticated users to update
CREATE POLICY "Auth update landing-assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'landing-assets');
