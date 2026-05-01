CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_workspace_sku
  ON public.product_variants (workspace_id, lower(sku))
  WHERE sku IS NOT NULL AND length(btrim(sku)) > 0;

CREATE OR REPLACE FUNCTION public.product_variants_enforce_workspace_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_ws uuid;
BEGIN
  SELECT workspace_id INTO parent_ws
  FROM public.products
  WHERE id = NEW.product_id;

  IF parent_ws IS NULL THEN
    RAISE EXCEPTION 'Produto pai % nao encontrado', NEW.product_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.workspace_id IS DISTINCT FROM parent_ws THEN
    RAISE EXCEPTION
      'workspace_id da variante (%) nao coincide com workspace_id do produto pai (%)',
      NEW.workspace_id, parent_ws
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_variants_workspace_match ON public.product_variants;
CREATE TRIGGER trg_product_variants_workspace_match
  BEFORE INSERT OR UPDATE OF workspace_id, product_id
  ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.product_variants_enforce_workspace_match();

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS chk_product_variants_stock_non_negative,
  DROP CONSTRAINT IF EXISTS chk_product_variants_price_non_negative,
  DROP CONSTRAINT IF EXISTS chk_product_variants_sort_order_non_negative;

ALTER TABLE public.product_variants
  ADD CONSTRAINT chk_product_variants_stock_non_negative
    CHECK (stock_quantity >= 0),
  ADD CONSTRAINT chk_product_variants_price_non_negative
    CHECK (price_override IS NULL OR price_override >= 0),
  ADD CONSTRAINT chk_product_variants_sort_order_non_negative
    CHECK (sort_order >= 0);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_sort
  ON public.product_variants (product_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_product_variants_workspace_active
  ON public.product_variants (workspace_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_variants_attributes_gin
  ON public.product_variants USING gin (attributes);