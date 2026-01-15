-- Add NIF and company data fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS cae_codes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cae_description text,
ADD COLUMN IF NOT EXISTS company_status text,
ADD COLUMN IF NOT EXISTS capital_social text,
ADD COLUMN IF NOT EXISTS founding_date text,
ADD COLUMN IF NOT EXISTS legal_nature text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS parish text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS fax text;

-- Add NIF and company data fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS cae_codes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cae_description text,
ADD COLUMN IF NOT EXISTS company_status text,
ADD COLUMN IF NOT EXISTS capital_social text,
ADD COLUMN IF NOT EXISTS founding_date text,
ADD COLUMN IF NOT EXISTS legal_nature text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS parish text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS fax text;

-- Add additional geo fields to workspaces
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS legal_nature text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS parish text,
ADD COLUMN IF NOT EXISTS capital_social text,
ADD COLUMN IF NOT EXISTS founding_date text,
ADD COLUMN IF NOT EXISTS fax text;

-- Create indexes for NIF search
CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON public.companies(tax_id);
CREATE INDEX IF NOT EXISTS idx_leads_tax_id ON public.leads(tax_id);
CREATE INDEX IF NOT EXISTS idx_companies_cae_codes ON public.companies USING GIN(cae_codes);
CREATE INDEX IF NOT EXISTS idx_leads_cae_codes ON public.leads USING GIN(cae_codes);