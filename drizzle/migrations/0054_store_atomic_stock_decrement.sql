CREATE OR REPLACE FUNCTION public.decrement_store_product_stock(p_workspace_id uuid, p_product_id uuid, p_quantity integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RETURN NULL; END IF;
  UPDATE public.products
     SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
         stock_status = CASE WHEN GREATEST(0, stock_quantity - p_quantity) = 0 THEN 'out_of_stock' ELSE 'in_stock' END
   WHERE id = p_product_id AND workspace_id = p_workspace_id
     AND track_stock = true AND stock_quantity IS NOT NULL
  RETURNING stock_quantity INTO v_new;
  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.decrement_store_product_stock(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_store_product_stock(uuid, uuid, integer) TO service_role;