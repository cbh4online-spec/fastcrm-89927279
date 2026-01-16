-- Add Google Local Services fields to leads table

-- GPS Coordinates
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Business hours (stored as JSON for flexibility)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_hours JSONB;

-- Rating and reviews
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS rating DECIMAL(2, 1);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reviews_count INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reviews JSONB;

-- Business category
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_category TEXT;

-- Photos (array of URLs)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Price level (1-4, representing € to €€€€)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS price_level INTEGER;

-- Services offered
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS services TEXT[];

-- Google Place ID for reference
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Add comments
COMMENT ON COLUMN public.leads.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN public.leads.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN public.leads.business_hours IS 'Business hours as JSON object';
COMMENT ON COLUMN public.leads.rating IS 'Google rating 1-5 stars';
COMMENT ON COLUMN public.leads.reviews_count IS 'Number of Google reviews';
COMMENT ON COLUMN public.leads.reviews IS 'Recent reviews as JSON array';
COMMENT ON COLUMN public.leads.business_category IS 'Type of business/category';
COMMENT ON COLUMN public.leads.photos IS 'Array of photo URLs';
COMMENT ON COLUMN public.leads.price_level IS 'Price level 1-4 (€ to €€€€)';
COMMENT ON COLUMN public.leads.services IS 'Array of services offered';
COMMENT ON COLUMN public.leads.google_place_id IS 'Google Places API place ID';