-- Add Instagram enrichment columns to professional_prospecting_profiles
ALTER TABLE public.professional_prospecting_profiles 
ADD COLUMN IF NOT EXISTS instagram_followers_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_following_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_posts_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_full_bio TEXT,
ADD COLUMN IF NOT EXISTS instagram_external_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_category TEXT,
ADD COLUMN IF NOT EXISTS instagram_is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_is_business BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS instagram_enriched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS instagram_raw_data JSONB;

-- Add index for enrichment status
CREATE INDEX IF NOT EXISTS idx_prospecting_profiles_enriched 
ON public.professional_prospecting_profiles(instagram_enriched_at) 
WHERE instagram_enriched_at IS NOT NULL;