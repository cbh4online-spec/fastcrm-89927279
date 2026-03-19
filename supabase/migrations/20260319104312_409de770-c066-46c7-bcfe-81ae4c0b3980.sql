ALTER TABLE public.lead_enricher_settings
ADD COLUMN IF NOT EXISTS google_places_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS nif_lookup_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS instagram_enrich_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS icp_score_enabled boolean NOT NULL DEFAULT false;