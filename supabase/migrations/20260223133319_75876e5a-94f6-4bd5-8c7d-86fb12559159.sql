
-- Novas colunas
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tax_included BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Slug unico por workspace (parcial, ignora NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug_workspace_unique
  ON public.products (workspace_id, sheet_slug)
  WHERE sheet_slug IS NOT NULL;
