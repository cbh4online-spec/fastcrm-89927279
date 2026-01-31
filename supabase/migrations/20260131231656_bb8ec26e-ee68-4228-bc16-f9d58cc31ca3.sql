-- =====================================================
-- Fase 7: AI - Semantic Search for Products
-- Embeddings + Match Function
-- =====================================================

-- 1. Add embedding column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 2. Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_products_embedding 
ON public.products 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. Create semantic search function for products
CREATE OR REPLACE FUNCTION public.match_products(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  short_description text,
  commercial_description text,
  base_price numeric,
  category text,
  images text[],
  primary_image_index int,
  status text,
  workspace_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    p.short_description,
    p.commercial_description,
    p.base_price,
    p.category,
    p.images,
    p.primary_image_index,
    p.status,
    p.workspace_id,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE 
    p.embedding IS NOT NULL
    AND p.status = 'active'
    AND (filter_workspace_id IS NULL OR p.workspace_id = filter_workspace_id)
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.match_products TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_products TO anon;