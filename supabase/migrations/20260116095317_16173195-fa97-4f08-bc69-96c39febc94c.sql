-- Add tax_id column to contacts table for direct invoicing
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tax_id text;

-- Add index for tax_id lookups
CREATE INDEX IF NOT EXISTS idx_contacts_tax_id ON public.contacts(tax_id) WHERE tax_id IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.contacts.tax_id IS 'NIF/Tax ID for direct invoicing, especially useful for sole proprietors (ENI)';