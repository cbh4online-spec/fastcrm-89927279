-- Add financial fields to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preferred_payment_method text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS credit_active boolean DEFAULT false;