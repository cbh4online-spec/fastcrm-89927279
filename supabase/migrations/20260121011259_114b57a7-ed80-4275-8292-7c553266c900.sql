-- Add missing columns to growth_settings table for SEO settings persistence
ALTER TABLE growth_settings
ADD COLUMN IF NOT EXISTS base_url text,
ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'pt',
ADD COLUMN IF NOT EXISTS supported_languages text[] DEFAULT ARRAY['pt'],
ADD COLUMN IF NOT EXISTS enable_schema_markup boolean DEFAULT true;