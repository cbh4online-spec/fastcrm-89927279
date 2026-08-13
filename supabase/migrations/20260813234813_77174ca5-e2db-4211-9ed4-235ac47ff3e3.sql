CREATE OR REPLACE FUNCTION public.generate_stock_count_items(_count_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.stock_counts%ROWTYPE;
  inserted integer := 0;
BEGIN
  SELECT * INTO c FROM public.stock_counts WHERE id = _count_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contagem não encontrada'; END IF;
  IF NOT (public.is_workspace_member(auth.uid(), c.workspace_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissões para esta contagem';
  END IF;
  IF c.status NOT IN ('draft','counting') THEN
    RAISE EXCEPTION 'A contagem já não permite gerar linhas';
  END IF;

  DELETE FROM public.stock_count_items WHERE count_id = _count_id AND counted_qty IS NULL;

  INSERT INTO public.stock_count_items (count_id, workspace_id, product_id, sku, product_name, category, expected_qty, unit_cost)
  SELECT _count_id, c.workspace_id, p.id, p.sku, p.name, p.category,
         COALESCE(pi.stock_on_hand, p.stock_quantity, 0),
         COALESCE(NULLIF(p.avg_cost, 0), NULLIF(p.last_cost, 0), NULLIF(p.direct_cost, 0), 0)
  FROM public.products p
  LEFT JOIN public.product_inventory pi ON pi.product_id = p.id AND pi.workspace_id = c.workspace_id
  WHERE p.workspace_id = c.workspace_id
    AND COALESCE(p.status, 'active') = 'active'
    AND (
      c.scope_type = 'all'
      OR (c.scope_type = 'category' AND p.category = c.scope_category)
      OR (c.scope_type = 'location' AND c.location_id IS NOT NULL AND p.location = c.location_id::text)
      OR (c.scope_type = 'products' AND p.id = ANY(COALESCE(c.scope_product_ids, ARRAY[]::uuid[])))
    )
  ON CONFLICT (count_id, product_id, variant_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  UPDATE public.stock_counts
  SET total_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id),
      counted_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id AND counted_qty IS NOT NULL),
      status = CASE WHEN status = 'draft' THEN 'counting' ELSE status END,
      started_at = COALESCE(started_at, now())
  WHERE id = _count_id;

  RETURN inserted;
END;
$$;