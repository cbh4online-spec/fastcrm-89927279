-- ============ TABELAS ============
CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  scope_type text NOT NULL DEFAULT 'all',
  scope_category text,
  scope_product_ids uuid[],
  location_id uuid REFERENCES public.product_stock_locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  blind_count boolean NOT NULL DEFAULT true,
  notes text,
  started_at timestamptz,
  closed_at timestamptz,
  created_by uuid,
  closed_by uuid,
  total_items integer NOT NULL DEFAULT 0,
  counted_items integer NOT NULL DEFAULT 0,
  variance_items integer NOT NULL DEFAULT 0,
  variance_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_counts_scope_type_chk CHECK (scope_type IN ('all','category','location','products')),
  CONSTRAINT stock_counts_status_chk CHECK (status IN ('draft','counting','review','closed','cancelled'))
);

CREATE TABLE public.stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  sku text,
  product_name text NOT NULL,
  category text,
  expected_qty integer NOT NULL DEFAULT 0,
  counted_qty integer,
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  counted_by uuid,
  counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_count_items_unique UNIQUE (count_id, product_id, variant_id)
);

CREATE INDEX idx_stock_counts_ws_status ON public.stock_counts(workspace_id, status);
CREATE INDEX idx_stock_count_items_count ON public.stock_count_items(count_id);
CREATE INDEX idx_stock_count_items_ws_product ON public.stock_count_items(workspace_id, product_id);

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_counts TO authenticated;
GRANT ALL ON public.stock_counts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_count_items TO authenticated;
GRANT ALL ON public.stock_count_items TO service_role;

-- ============ RLS ============
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_counts_select" ON public.stock_counts FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "stock_counts_insert" ON public.stock_counts FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "stock_counts_update" ON public.stock_counts FOR UPDATE TO authenticated
  USING ((public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())) AND status <> 'closed')
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "stock_counts_delete" ON public.stock_counts FOR DELETE TO authenticated
  USING ((public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())) AND status <> 'closed');

CREATE POLICY "stock_count_items_select" ON public.stock_count_items FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "stock_count_items_insert" ON public.stock_count_items FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "stock_count_items_update" ON public.stock_count_items FOR UPDATE TO authenticated
  USING (
    (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stock_counts c WHERE c.id = count_id AND c.status IN ('draft','counting','review'))
  )
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "stock_count_items_delete" ON public.stock_count_items FOR DELETE TO authenticated
  USING (
    (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
    AND EXISTS (SELECT 1 FROM public.stock_counts c WHERE c.id = count_id AND c.status <> 'closed')
  );

CREATE TRIGGER update_stock_counts_updated_at BEFORE UPDATE ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_count_items_updated_at BEFORE UPDATE ON public.stock_count_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPC: gerar linhas ============
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
         COALESCE(pi.stock_on_hand, 0),
         COALESCE(p.cost_price, 0)
  FROM public.products p
  LEFT JOIN public.product_inventory pi ON pi.product_id = p.id AND pi.workspace_id = c.workspace_id
  WHERE p.workspace_id = c.workspace_id
    AND COALESCE(p.status, 'active') = 'active'
    AND (
      c.scope_type = 'all'
      OR (c.scope_type = 'category' AND p.category = c.scope_category)
      OR (c.scope_type = 'location')
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

-- ============ RPC: registar contagem de item ============
CREATE OR REPLACE FUNCTION public.submit_stock_count_item(_count_id uuid, _product_id uuid, _qty integer, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.stock_counts%ROWTYPE;
  item_id uuid;
BEGIN
  SELECT * INTO c FROM public.stock_counts WHERE id = _count_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contagem não encontrada'; END IF;
  IF NOT (public.is_workspace_member(auth.uid(), c.workspace_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissões para esta contagem';
  END IF;
  IF c.status NOT IN ('draft','counting','review') THEN
    RAISE EXCEPTION 'A contagem está fechada';
  END IF;
  IF _qty IS NULL OR _qty < 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;

  INSERT INTO public.stock_count_items (count_id, workspace_id, product_id, sku, product_name, category, expected_qty, unit_cost, counted_qty, notes, counted_by, counted_at)
  SELECT _count_id, c.workspace_id, p.id, p.sku, p.name, p.category,
         COALESCE(pi.stock_on_hand, 0), COALESCE(p.cost_price, 0), _qty, _notes, auth.uid(), now()
  FROM public.products p
  LEFT JOIN public.product_inventory pi ON pi.product_id = p.id AND pi.workspace_id = c.workspace_id
  WHERE p.id = _product_id AND p.workspace_id = c.workspace_id
  ON CONFLICT (count_id, product_id, variant_id) DO UPDATE
    SET counted_qty = EXCLUDED.counted_qty,
        notes = COALESCE(EXCLUDED.notes, public.stock_count_items.notes),
        counted_by = EXCLUDED.counted_by,
        counted_at = EXCLUDED.counted_at,
        updated_at = now()
  RETURNING id INTO item_id;

  IF item_id IS NULL THEN RAISE EXCEPTION 'Produto não pertence a este workspace'; END IF;

  UPDATE public.stock_counts
  SET total_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id),
      counted_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id AND counted_qty IS NOT NULL),
      variance_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id AND counted_qty IS NOT NULL AND counted_qty <> expected_qty),
      status = CASE WHEN status = 'draft' THEN 'counting' ELSE status END,
      started_at = COALESCE(started_at, now())
  WHERE id = _count_id;

  RETURN item_id;
END;
$$;

-- ============ RPC: fechar contagem ============
CREATE OR REPLACE FUNCTION public.close_stock_count(_count_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.stock_counts%ROWTYPE;
  r RECORD;
  adjustments integer := 0;
  total_value numeric := 0;
BEGIN
  SELECT * INTO c FROM public.stock_counts WHERE id = _count_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contagem não encontrada'; END IF;
  IF NOT (public.can_manage_workspace(auth.uid(), c.workspace_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Apenas gestores do workspace podem fechar a contagem';
  END IF;
  IF c.status = 'closed' THEN RAISE EXCEPTION 'A contagem já está fechada'; END IF;

  FOR r IN
    SELECT * FROM public.stock_count_items
    WHERE count_id = _count_id AND counted_qty IS NOT NULL AND counted_qty <> expected_qty
  LOOP
    INSERT INTO public.product_stock_movements
      (workspace_id, product_id, variant_id, location_id, movement_type, quantity, reason, reference_type, reference_id, notes, unit_cost, balance_after, created_by)
    VALUES
      (c.workspace_id, r.product_id, r.variant_id, c.location_id, 'adjustment', r.counted_qty - r.expected_qty,
       'stock_count', 'stock_count', _count_id::text, r.notes, r.unit_cost, r.counted_qty, auth.uid());

    INSERT INTO public.product_inventory (product_id, workspace_id, stock_on_hand)
    VALUES (r.product_id, c.workspace_id, r.counted_qty)
    ON CONFLICT (product_id, workspace_id) DO UPDATE
      SET stock_on_hand = EXCLUDED.stock_on_hand, updated_at = now();

    UPDATE public.products SET stock_quantity = r.counted_qty, updated_at = now()
    WHERE id = r.product_id AND workspace_id = c.workspace_id;

    adjustments := adjustments + 1;
    total_value := total_value + ((r.counted_qty - r.expected_qty) * COALESCE(r.unit_cost, 0));
  END LOOP;

  UPDATE public.stock_counts
  SET status = 'closed',
      closed_at = now(),
      closed_by = auth.uid(),
      variance_items = adjustments,
      variance_value = total_value,
      counted_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id AND counted_qty IS NOT NULL),
      total_items = (SELECT count(*) FROM public.stock_count_items WHERE count_id = _count_id)
  WHERE id = _count_id;

  RETURN jsonb_build_object('adjustments', adjustments, 'variance_value', total_value);
END;
$$;