
ALTER TABLE c2c_listings 
  ADD COLUMN IF NOT EXISTS photos_360 text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public) 
VALUES ('c2c-videos', 'c2c-videos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "c2c videos upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'c2c-videos');

CREATE POLICY "c2c videos read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'c2c-videos');
