CREATE UNIQUE INDEX IF NOT EXISTS products_workspace_barcode_unique_idx
  ON public.products (workspace_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';