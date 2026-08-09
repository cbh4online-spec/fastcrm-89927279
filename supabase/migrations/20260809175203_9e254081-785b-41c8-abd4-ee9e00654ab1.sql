ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS product_page_config jsonb NOT NULL DEFAULT '{}'::jsonb;