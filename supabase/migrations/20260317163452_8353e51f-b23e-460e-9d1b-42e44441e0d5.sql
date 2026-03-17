
-- Add missing enrichment columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS about TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS activity_description TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS racius_url TEXT;
