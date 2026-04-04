
-- Step 1: Add slug and store_visible to product_categories
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS store_visible boolean NOT NULL DEFAULT true;

-- Step 2: Generate slugs from existing names (simple lowercase + replace spaces with hyphens)
UPDATE public.product_categories
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '[^a-zA-Z0-9áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- Step 3: Add unique constraint on (workspace_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_ws_slug 
  ON public.product_categories (workspace_id, slug);

-- Step 4: Drop existing FK from products.store_category_id → store_categories
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_store_category_id_fkey;

-- Step 5: Add FK from products.store_category_id → product_categories
ALTER TABLE public.products
  ADD CONSTRAINT products_store_category_id_fkey
  FOREIGN KEY (store_category_id) REFERENCES public.product_categories(id)
  ON DELETE SET NULL;

-- Step 6: Map existing products to product_categories by matching category text to name
UPDATE public.products p
SET store_category_id = pc.id
FROM public.product_categories pc
WHERE p.category = pc.name
  AND p.workspace_id = pc.workspace_id
  AND p.store_category_id IS NULL;
