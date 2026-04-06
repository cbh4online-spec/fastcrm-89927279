ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS facebook_capi_token TEXT,
  ADD COLUMN IF NOT EXISTS facebook_catalog_id TEXT,
  ADD COLUMN IF NOT EXISTS google_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS indexnow_key TEXT;