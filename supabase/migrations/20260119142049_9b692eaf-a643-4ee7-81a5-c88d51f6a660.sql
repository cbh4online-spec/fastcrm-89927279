-- Add payment_conditions column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS payment_conditions TEXT;