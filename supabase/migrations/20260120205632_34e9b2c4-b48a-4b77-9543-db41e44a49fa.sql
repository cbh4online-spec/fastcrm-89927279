-- Add contact extraction columns to professional_prospecting_profiles
ALTER TABLE professional_prospecting_profiles
ADD COLUMN IF NOT EXISTS extracted_email TEXT,
ADD COLUMN IF NOT EXISTS extracted_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_source TEXT;

-- Add comment for documentation
COMMENT ON COLUMN professional_prospecting_profiles.extracted_email IS 'Email extracted from bio or external links';
COMMENT ON COLUMN professional_prospecting_profiles.extracted_phone IS 'Phone number extracted from bio or external links';
COMMENT ON COLUMN professional_prospecting_profiles.contact_source IS 'Source of contact info: bio, external_link, website';