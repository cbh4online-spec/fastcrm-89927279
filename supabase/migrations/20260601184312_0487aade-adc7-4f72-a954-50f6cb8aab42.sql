ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_state TEXT,
  ADD COLUMN IF NOT EXISTS external_sequence_number TEXT,
  ADD COLUMN IF NOT EXISTS external_state_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_external_sync
  ON public.invoices (external_provider, external_id)
  WHERE external_id IS NOT NULL;