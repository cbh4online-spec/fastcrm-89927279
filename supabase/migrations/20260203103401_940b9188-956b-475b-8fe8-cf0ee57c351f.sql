-- Add contact_id and company_id columns to crm_activities table
ALTER TABLE public.crm_activities 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE public.crm_activities 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id ON public.crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company_id ON public.crm_activities(company_id);