ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_document_type TEXT;