-- Add client and conditions fields to proposals table
ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_conditions text,
  ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS billing_nif text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_contact ON public.proposals(contact_id);
CREATE INDEX IF NOT EXISTS idx_proposals_company ON public.proposals(company_id);

-- Add RLS policies for the new columns (using existing policies)
-- The existing RLS policies on proposals table will automatically apply to the new columns