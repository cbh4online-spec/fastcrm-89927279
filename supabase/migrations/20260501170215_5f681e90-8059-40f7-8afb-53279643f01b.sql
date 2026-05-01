-- 1. Add variant_id to partner_order_items
ALTER TABLE public.partner_order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_order_items_variant
  ON public.partner_order_items(variant_id) WHERE variant_id IS NOT NULL;

-- 2. RPC: atomic stock decrement for a variant
CREATE OR REPLACE FUNCTION public.decrement_partner_variant_stock(
  p_workspace_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_allow_backorder boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.product_variants%ROWTYPE;
  v_new_stock integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  END IF;

  SELECT * INTO v_row
  FROM public.product_variants
  WHERE id = p_variant_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'variant_not_found');
  END IF;

  -- Skip stock control when variant is not tracked
  IF NOT v_row.track_stock THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_tracked');
  END IF;

  v_new_stock := v_row.stock_quantity - p_quantity;

  IF v_new_stock < 0 AND NOT COALESCE(p_allow_backorder, false) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_stock',
      'available', v_row.stock_quantity,
      'requested', p_quantity
    );
  END IF;

  UPDATE public.product_variants
     SET stock_quantity = GREATEST(v_new_stock, 0),
         updated_at = now()
   WHERE id = p_variant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'previous_stock', v_row.stock_quantity,
    'new_stock', GREATEST(v_new_stock, 0),
    'backorder', v_new_stock < 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_partner_variant_stock(uuid, uuid, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_partner_variant_stock(uuid, uuid, integer, boolean) TO authenticated, service_role;