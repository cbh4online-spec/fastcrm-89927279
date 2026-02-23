ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS storage_path TEXT;