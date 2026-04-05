
-- Add promotion fields to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_start_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_end_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_label text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lowest_price_30d numeric DEFAULT NULL;

-- Function to calculate lowest price in last 30 days (Omnibus Directive)
CREATE OR REPLACE FUNCTION public.calculate_lowest_price_30d()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lowest numeric;
BEGIN
  -- Only calculate when compare_at_price is set (product is on promotion)
  IF NEW.compare_at_price IS NOT NULL THEN
    -- Get the lowest price from the last 30 days from price history
    SELECT MIN(price) INTO v_lowest
    FROM public.product_price_history
    WHERE product_id = NEW.id
      AND recorded_at >= (now() - interval '30 days');

    -- If no history, use compare_at_price as the reference
    IF v_lowest IS NULL THEN
      v_lowest := NEW.compare_at_price;
    END IF;

    NEW.lowest_price_30d := v_lowest;
  ELSE
    -- Clear lowest price when not on promotion
    NEW.lowest_price_30d := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate lowest_price_30d
DROP TRIGGER IF EXISTS trg_calculate_lowest_price_30d ON public.products;
CREATE TRIGGER trg_calculate_lowest_price_30d
  BEFORE INSERT OR UPDATE OF compare_at_price, base_price
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_lowest_price_30d();

-- Index for active promotions lookup
CREATE INDEX IF NOT EXISTS idx_products_active_promo
  ON public.products (promo_start_at, promo_end_at)
  WHERE compare_at_price IS NOT NULL;
