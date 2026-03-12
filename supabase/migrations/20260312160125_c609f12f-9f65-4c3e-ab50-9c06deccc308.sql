
INSERT INTO storage.buckets (id, name, public)
VALUES ('funnel-assets', 'funnel-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read funnel assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'funnel-assets');

CREATE POLICY "Authenticated users can upload funnel assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'funnel-assets');
