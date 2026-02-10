
-- Add new columns to community_settings
ALTER TABLE public.community_settings
ADD COLUMN IF NOT EXISTS visible_tabs JSONB DEFAULT '{"discussao": true, "eventos": true, "classificacao": true, "membros": true, "acerca": true}'::jsonb,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_price NUMERIC,
ADD COLUMN IF NOT EXISTS theme_preset TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add new columns to forum_categories
ALTER TABLE public.forum_categories
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN DEFAULT false;

-- Create storage bucket for community assets
INSERT INTO storage.buckets (id, name, public) VALUES ('community-assets', 'community-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read
CREATE POLICY "Community assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-assets');

-- Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload community assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-assets' AND auth.uid() IS NOT NULL);

-- Storage policy: authenticated users can update their uploads
CREATE POLICY "Authenticated users can update community assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'community-assets' AND auth.uid() IS NOT NULL);

-- Storage policy: authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete community assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'community-assets' AND auth.uid() IS NOT NULL);
