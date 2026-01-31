-- Add search_keywords column for full-text search
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_keywords text;

-- Create text search index
CREATE INDEX IF NOT EXISTS idx_products_search_keywords_gin 
ON products USING gin(to_tsvector('portuguese', COALESCE(search_keywords, '')));

-- Update match_products function to use text search instead of vector
CREATE OR REPLACE FUNCTION match_products(
  query_text text,
  match_count int DEFAULT 10,
  filter_workspace_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  base_price numeric,
  category text,
  short_description text,
  images text[],
  primary_image_index int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_query tsquery;
BEGIN
  -- Convert search text to tsquery with prefix matching
  search_query := plainto_tsquery('portuguese', query_text);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.sku,
    p.base_price,
    p.category,
    p.short_description,
    p.images,
    p.primary_image_index,
    ts_rank(to_tsvector('portuguese', COALESCE(p.search_keywords, '') || ' ' || COALESCE(p.name, '') || ' ' || COALESCE(p.short_description, '')), search_query)::float as similarity
  FROM products p
  WHERE 
    p.status = 'active'
    AND (filter_workspace_id IS NULL OR p.workspace_id = filter_workspace_id)
    AND (
      to_tsvector('portuguese', COALESCE(p.search_keywords, '') || ' ' || COALESCE(p.name, '') || ' ' || COALESCE(p.short_description, '')) @@ search_query
      OR p.name ILIKE '%' || query_text || '%'
      OR p.short_description ILIKE '%' || query_text || '%'
      OR p.search_keywords ILIKE '%' || query_text || '%'
    )
  ORDER BY similarity DESC, p.name ASC
  LIMIT match_count;
END;
$$;