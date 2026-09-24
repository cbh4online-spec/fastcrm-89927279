-- Sincronização de stock a partir da página do fornecedor
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS product_url text,
  ADD COLUMN IF NOT EXISTS stock_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_stock_level text,
  ADD COLUMN IF NOT EXISTS reported_stock_qty integer,
  ADD COLUMN IF NOT EXISTS stock_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_sync_error text;

ALTER TABLE public.supplier_products
  DROP CONSTRAINT IF EXISTS supplier_products_reported_stock_level_check;
ALTER TABLE public.supplier_products
  ADD CONSTRAINT supplier_products_reported_stock_level_check
  CHECK (reported_stock_level IS NULL OR reported_stock_level IN ('high','low','none'));

CREATE INDEX IF NOT EXISTS idx_supplier_products_stock_sync
  ON public.supplier_products (workspace_id, stock_sync_enabled)
  WHERE stock_sync_enabled = true;

COMMENT ON COLUMN public.supplier_products.product_url IS 'URL da página do produto no portal do fornecedor, usada para leitura automática de stock';