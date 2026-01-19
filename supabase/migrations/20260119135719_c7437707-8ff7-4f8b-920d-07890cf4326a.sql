-- Add swift_bic column to invoice_settings
ALTER TABLE public.invoice_settings
ADD COLUMN swift_bic TEXT;