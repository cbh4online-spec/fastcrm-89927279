
ALTER TABLE public.vertical_landing_events 
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS page_section text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip_hash text;

CREATE INDEX IF NOT EXISTS idx_vle_utm_source ON public.vertical_landing_events(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vle_created_at ON public.vertical_landing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_vle_country ON public.vertical_landing_events(country) WHERE country IS NOT NULL;
