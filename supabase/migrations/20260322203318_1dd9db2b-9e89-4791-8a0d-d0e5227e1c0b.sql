
-- Add default_markup_pct to supplier_feeds if not exists
ALTER TABLE public.supplier_feeds 
  ADD COLUMN IF NOT EXISTS default_markup_pct NUMERIC(5,2) DEFAULT 30;

-- Add unique constraint on product_images for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_images_product_id_url_key'
  ) THEN
    ALTER TABLE public.product_images ADD CONSTRAINT product_images_product_id_url_key UNIQUE (product_id, url);
  END IF;
END $$;
