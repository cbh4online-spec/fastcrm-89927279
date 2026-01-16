-- Add company_id foreign key to contacts table
ALTER TABLE public.contacts ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add is_primary_contact flag to contacts
ALTER TABLE public.contacts ADD COLUMN is_primary_contact boolean DEFAULT false;

-- Add entity_type to companies table
ALTER TABLE public.companies ADD COLUMN entity_type text DEFAULT 'company';

-- Add index for company_id lookups
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);

-- Add index for finding primary contacts
CREATE INDEX idx_contacts_primary ON public.contacts(company_id, is_primary_contact) WHERE is_primary_contact = true;