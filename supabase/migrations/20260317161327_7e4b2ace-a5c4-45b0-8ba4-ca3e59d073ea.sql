-- Add lead_type to distinguish person vs company leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type TEXT NOT NULL DEFAULT 'person'
  CHECK (lead_type IN ('person', 'company'));

-- Add useful company fields not yet present
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS number_of_employees TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC(14,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_person_role TEXT;

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON public.leads(lead_type);

COMMENT ON COLUMN public.leads.lead_type IS 'person or company';
COMMENT ON COLUMN public.leads.contact_person IS 'Primary contact person name (for company leads)';
COMMENT ON COLUMN public.leads.contact_person_role IS 'Role/title of the contact person';