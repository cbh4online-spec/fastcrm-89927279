INSERT INTO storage.buckets (id, name, public)
VALUES ('c2c-photos', 'c2c-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "c2c photos public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'c2c-photos');

CREATE POLICY "c2c photos authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'c2c-photos');

CREATE POLICY "c2c photos service role upload" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'c2c-photos');