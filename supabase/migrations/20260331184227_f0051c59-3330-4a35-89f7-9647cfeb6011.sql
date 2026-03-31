
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-avatars', 'hr-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view hr avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'hr-avatars');

CREATE POLICY "Authenticated users can upload hr avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hr-avatars');

CREATE POLICY "Authenticated users can update hr avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hr-avatars');

CREATE POLICY "Authenticated users can delete hr avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hr-avatars');
