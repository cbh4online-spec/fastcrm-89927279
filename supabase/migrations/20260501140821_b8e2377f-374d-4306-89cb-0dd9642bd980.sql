DROP TRIGGER IF EXISTS validate_product_variant_trigger ON public.products;
DROP FUNCTION IF EXISTS public.validate_product_variant();
DROP INDEX IF EXISTS public.idx_products_variant_parent_id;
ALTER TABLE public.products
  DROP COLUMN IF EXISTS variant_parent_id,
  DROP COLUMN IF EXISTS variant_attributes,
  DROP COLUMN IF EXISTS variant_label;