-- Add new fields to workspaces for professional client documents
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS company_iban text,
  ADD COLUMN IF NOT EXISTS signature_name text,
  ADD COLUMN IF NOT EXISTS signature_title text,
  ADD COLUMN IF NOT EXISTS payment_info text;