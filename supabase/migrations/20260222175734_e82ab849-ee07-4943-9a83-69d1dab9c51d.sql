
ALTER TABLE lead_enricher_settings
ADD COLUMN IF NOT EXISTS service_offer text,
ADD COLUMN IF NOT EXISTS service_pain_points text;

ALTER TABLE professional_prospecting_profiles
ADD COLUMN IF NOT EXISTS outreach_step integer DEFAULT 0;
