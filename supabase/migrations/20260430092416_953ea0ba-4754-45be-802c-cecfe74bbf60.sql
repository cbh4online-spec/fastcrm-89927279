ALTER TABLE public.product_ocr_documents
  ADD COLUMN IF NOT EXISTS wizard_state jsonb,
  ADD COLUMN IF NOT EXISTS wizard_last_saved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_product_ocr_documents_drafts
  ON public.product_ocr_documents (workspace_id, wizard_last_saved_at DESC)
  WHERE product_id IS NULL;