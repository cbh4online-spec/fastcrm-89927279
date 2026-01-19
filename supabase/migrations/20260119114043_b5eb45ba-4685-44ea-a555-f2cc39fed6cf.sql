-- Add company_context column to store rich extracted data from website
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS company_context JSONB DEFAULT '{}';

COMMENT ON COLUMN public.companies.company_context IS 
  'Rich context extracted from company website: about_us, services, clients, team, mission, etc.';