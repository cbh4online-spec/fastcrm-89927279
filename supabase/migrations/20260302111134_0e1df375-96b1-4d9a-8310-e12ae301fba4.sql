-- First deduplicate existing SKUs by appending suffix to duplicates
WITH duplicates AS (
  SELECT id, workspace_id, sku, 
    ROW_NUMBER() OVER (PARTITION BY workspace_id, LOWER(sku) ORDER BY created_at ASC) as rn
  FROM public.products
  WHERE sku IS NOT NULL AND sku != ''
)
UPDATE public.products p
SET sku = p.sku || '-dup-' || d.rn
FROM duplicates d
WHERE p.id = d.id AND d.rn > 1;

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS products_workspace_sku_unique_idx ON public.products (workspace_id, LOWER(sku)) WHERE sku IS NOT NULL AND sku != '';