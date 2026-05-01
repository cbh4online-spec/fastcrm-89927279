-- =====================================================================
-- Reserva e release de stock de variantes no fluxo de aprovação B2B
-- =====================================================================

-- 1) Coluna de reservas em product_variants
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS stock_reserved INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_stock_reserved_nonneg;
ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_stock_reserved_nonneg CHECK (stock_reserved >= 0);

CREATE INDEX IF NOT EXISTS idx_product_variants_stock_reserved
  ON public.product_variants (workspace_id, product_id)
  WHERE stock_reserved > 0;

-- 2) Flag idempotente no header da encomenda B2B
ALTER TABLE public.partner_order_headers
  ADD COLUMN IF NOT EXISTS stock_committed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN NOT NULL DEFAULT false;

-- =====================================================================
-- 3) RPC: reserve_partner_variant_stock
--    Incrementa stock_reserved (não toca stock_quantity).
--    Usada quando encomenda fica awaiting_approval.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reserve_partner_variant_stock(
  p_workspace_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER,
  p_allow_backorder BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant RECORD;
  v_available INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  END IF;

  SELECT id, stock_quantity, stock_reserved, track_stock, workspace_id
    INTO v_variant
  FROM public.product_variants
  WHERE id = p_variant_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'variant_not_found');
  END IF;

  IF NOT v_variant.track_stock THEN
    RETURN jsonb_build_object('ok', true, 'tracked', false);
  END IF;

  v_available := v_variant.stock_quantity - v_variant.stock_reserved;

  IF v_available < p_quantity AND NOT p_allow_backorder THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_stock',
      'available', v_available
    );
  END IF;

  UPDATE public.product_variants
     SET stock_reserved = stock_reserved + p_quantity,
         updated_at = now()
   WHERE id = p_variant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reserved', p_quantity,
    'stock_quantity', v_variant.stock_quantity,
    'stock_reserved_after', v_variant.stock_reserved + p_quantity
  );
END;
$$;

-- =====================================================================
-- 4) RPC: release_partner_variant_stock
--    Decrementa stock_reserved (usado em rejeição/cancelamento).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.release_partner_variant_stock(
  p_workspace_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant RECORD;
  v_release INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  END IF;

  SELECT id, stock_reserved, track_stock
    INTO v_variant
  FROM public.product_variants
  WHERE id = p_variant_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'variant_not_found');
  END IF;

  IF NOT v_variant.track_stock THEN
    RETURN jsonb_build_object('ok', true, 'tracked', false);
  END IF;

  -- Cap: não libertar mais do que está reservado
  v_release := LEAST(p_quantity, v_variant.stock_reserved);

  UPDATE public.product_variants
     SET stock_reserved = stock_reserved - v_release,
         updated_at = now()
   WHERE id = p_variant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'released', v_release,
    'stock_reserved_after', v_variant.stock_reserved - v_release
  );
END;
$$;

-- =====================================================================
-- 5) RPC: commit_partner_variant_stock
--    Move da reserva para venda real: decrementa stock_quantity E stock_reserved.
--    Usado quando encomenda passa de awaiting_approval para approved/submitted.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.commit_partner_variant_stock(
  p_workspace_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER,
  p_allow_backorder BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant RECORD;
  v_release INTEGER;
  v_new_stock INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity');
  END IF;

  SELECT id, stock_quantity, stock_reserved, track_stock
    INTO v_variant
  FROM public.product_variants
  WHERE id = p_variant_id AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'variant_not_found');
  END IF;

  IF NOT v_variant.track_stock THEN
    RETURN jsonb_build_object('ok', true, 'tracked', false);
  END IF;

  -- Liberta o que estava reservado para esta quantidade (se houver)
  v_release := LEAST(p_quantity, v_variant.stock_reserved);
  v_new_stock := v_variant.stock_quantity - p_quantity;

  IF v_new_stock < 0 AND NOT p_allow_backorder THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_stock',
      'available', v_variant.stock_quantity
    );
  END IF;

  UPDATE public.product_variants
     SET stock_quantity = v_new_stock,
         stock_reserved = stock_reserved - v_release,
         updated_at = now()
   WHERE id = p_variant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'committed', p_quantity,
    'released_reserve', v_release,
    'stock_quantity_after', v_new_stock,
    'stock_reserved_after', v_variant.stock_reserved - v_release
  );
END;
$$;

-- =====================================================================
-- 6) Trigger: ao mudar status do header, fazer commit/release automático
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_partner_order_stock_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_result JSONB;
  v_committed_status TEXT[] := ARRAY['submitted','approved','processing','shipped','delivered','invoiced','completed'];
  v_released_status  TEXT[] := ARRAY['rejected','cancelled','refused'];
BEGIN
  -- Só processa se houve transição de status
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- COMMIT: awaiting_approval -> approved/submitted/etc.
  IF OLD.status = 'awaiting_approval'
     AND NEW.status = ANY (v_committed_status)
     AND NEW.stock_committed = false THEN

    FOR v_item IN
      SELECT variant_id, quantity, product_name
        FROM public.partner_order_items
       WHERE partner_order_id = NEW.id
         AND variant_id IS NOT NULL
    LOOP
      v_result := public.commit_partner_variant_stock(
        NEW.workspace_id,
        v_item.variant_id,
        v_item.quantity,
        true -- allow_backorder true no commit para não bloquear aprovação
      );
      RAISE LOG '[partner-order-lifecycle] commit % qty=% result=%',
        v_item.variant_id, v_item.quantity, v_result;
    END LOOP;

    NEW.stock_committed := true;
    NEW.stock_reserved  := false;

  -- RELEASE: awaiting_approval -> cancelled/rejected
  ELSIF OLD.status = 'awaiting_approval'
        AND NEW.status = ANY (v_released_status)
        AND NEW.stock_reserved = true THEN

    FOR v_item IN
      SELECT variant_id, quantity
        FROM public.partner_order_items
       WHERE partner_order_id = NEW.id
         AND variant_id IS NOT NULL
    LOOP
      v_result := public.release_partner_variant_stock(
        NEW.workspace_id,
        v_item.variant_id,
        v_item.quantity
      );
      RAISE LOG '[partner-order-lifecycle] release % qty=% result=%',
        v_item.variant_id, v_item.quantity, v_result;
    END LOOP;

    NEW.stock_reserved  := false;

  -- RELEASE também quando uma encomenda já comprometida é cancelada
  -- (devolve ao stock_quantity)
  ELSIF OLD.stock_committed = true
        AND NEW.status = ANY (v_released_status)
        AND OLD.status <> ALL (v_released_status) THEN

    FOR v_item IN
      SELECT variant_id, quantity
        FROM public.partner_order_items
       WHERE partner_order_id = NEW.id
         AND variant_id IS NOT NULL
    LOOP
      UPDATE public.product_variants
         SET stock_quantity = stock_quantity + v_item.quantity,
             updated_at = now()
       WHERE id = v_item.variant_id
         AND workspace_id = NEW.workspace_id
         AND track_stock = true;
    END LOOP;

    NEW.stock_committed := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_order_stock_lifecycle ON public.partner_order_headers;
CREATE TRIGGER trg_partner_order_stock_lifecycle
  BEFORE UPDATE OF status ON public.partner_order_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_partner_order_stock_lifecycle();

-- =====================================================================
-- 7) Permissões
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.reserve_partner_variant_stock(UUID, UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_partner_variant_stock(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_partner_variant_stock(UUID, UUID, INTEGER, BOOLEAN) TO authenticated;
