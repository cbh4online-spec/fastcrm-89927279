ALTER TABLE public.store_settings 
  ADD COLUMN store_slug TEXT;

CREATE UNIQUE INDEX idx_store_settings_slug 
  ON public.store_settings(store_slug) 
  WHERE store_slug IS NOT NULL;