ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_cover_per_product
ON public.product_images (product_id)
WHERE is_cover = true;

CREATE INDEX IF NOT EXISTS product_images_order_idx
ON public.product_images (product_id, is_cover DESC, position ASC, created_at ASC);