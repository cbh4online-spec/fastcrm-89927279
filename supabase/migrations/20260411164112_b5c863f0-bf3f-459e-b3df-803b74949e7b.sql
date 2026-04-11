
-- 1. Drop and recreate increment_listing_views
DROP FUNCTION IF EXISTS public.increment_listing_views(uuid);

CREATE FUNCTION public.increment_listing_views(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE c2c_listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO authenticated;

-- 2. Add views_count to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- 3. Create increment_product_views RPC
CREATE OR REPLACE FUNCTION public.increment_product_views(product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_views(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_product_views(uuid) TO authenticated;

-- 4. Trigger to auto-update products.views_count from store_page_views
CREATE OR REPLACE FUNCTION public.trg_increment_product_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_store_page_view_increment ON public.store_page_views;
CREATE TRIGGER on_store_page_view_increment
  AFTER INSERT ON public.store_page_views
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_increment_product_views();
