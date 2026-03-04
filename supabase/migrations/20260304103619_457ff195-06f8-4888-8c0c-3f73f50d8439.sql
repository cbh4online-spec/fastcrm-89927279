
ALTER TABLE public.rfq_quotes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_quotes_item_supplier
  ON public.rfq_quotes(workspace_id, rfq_id, rfq_item_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_rfq_quotes_supplier_sheet
  ON public.rfq_quotes(workspace_id, rfq_id, supplier_id);
