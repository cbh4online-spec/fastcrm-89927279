-- Add consumption model fields to products table

-- Consumption model enum-like field
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS consumption_model text DEFAULT 'units';

-- Number of sessions/units included
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS included_quantity integer DEFAULT NULL;

-- Recommended frequency (e.g., 'weekly', 'monthly', 'biweekly')
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS recommended_frequency text DEFAULT NULL;

-- Typical duration in days (e.g., 30, 90, 365)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS typical_duration_days integer DEFAULT NULL;

-- Whether consumption is trackable
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_trackable boolean DEFAULT true;

-- Update product_type to include new types
COMMENT ON COLUMN public.products.product_type IS 'Type of product: simple, recurring, sessions, composite, formacao, programa, physical';

COMMENT ON COLUMN public.products.consumption_model IS 'How the product is consumed: sessions, units, time, free';

COMMENT ON COLUMN public.products.included_quantity IS 'Number of sessions/units included in the product';

COMMENT ON COLUMN public.products.recommended_frequency IS 'Recommended usage frequency: weekly, biweekly, monthly, etc.';

COMMENT ON COLUMN public.products.typical_duration_days IS 'Typical duration of the product in days';

COMMENT ON COLUMN public.products.is_trackable IS 'Whether consumption can be tracked';