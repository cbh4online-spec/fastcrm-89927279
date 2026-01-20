-- Add Instagram enrichment fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS instagram_followers_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_following_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_posts_count INTEGER,
ADD COLUMN IF NOT EXISTS instagram_bio TEXT,
ADD COLUMN IF NOT EXISTS instagram_external_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_category TEXT,
ADD COLUMN IF NOT EXISTS instagram_is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_is_business BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_enriched_at TIMESTAMP WITH TIME ZONE;

-- Add AI analysis fields
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS inferred_type TEXT,
ADD COLUMN IF NOT EXISTS inferred_profession TEXT,
ADD COLUMN IF NOT EXISTS inferred_specialty TEXT,
ADD COLUMN IF NOT EXISTS inferred_workplace TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC,
ADD COLUMN IF NOT EXISTS lead_score_explanation TEXT,
ADD COLUMN IF NOT EXISTS lead_score_factors JSONB;

-- Add prospecting source reference
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS prospecting_profile_id UUID REFERENCES public.professional_prospecting_profiles(id),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_prospecting_profile ON public.leads(prospecting_profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_inferred_profession ON public.leads(inferred_profession);
CREATE INDEX IF NOT EXISTS idx_leads_instagram_followers ON public.leads(instagram_followers_count);