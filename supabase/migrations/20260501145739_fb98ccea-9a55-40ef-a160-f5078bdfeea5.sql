
-- ===========================================
-- B2B CHECKOUT: AOV + ABANDONED CART RECOVERY
-- ===========================================

-- 1. QUANTITY BREAKS
CREATE TABLE public.partner_quantity_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID,
  partner_tier_id UUID REFERENCES public.partner_tiers(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL CHECK (min_qty > 0),
  discount_pct NUMERIC(5,2) NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (product_id IS NOT NULL OR category_id IS NOT NULL OR partner_tier_id IS NOT NULL)
);
CREATE INDEX idx_pqb_workspace ON public.partner_quantity_breaks(workspace_id) WHERE is_active;
CREATE INDEX idx_pqb_product ON public.partner_quantity_breaks(product_id) WHERE is_active AND product_id IS NOT NULL;
CREATE INDEX idx_pqb_category ON public.partner_quantity_breaks(category_id) WHERE is_active AND category_id IS NOT NULL;

ALTER TABLE public.partner_quantity_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY pqb_ws ON public.partner_quantity_breaks
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- 2. BUNDLES
CREATE TABLE public.partner_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  partner_tier_id UUID REFERENCES public.partner_tiers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pb_workspace ON public.partner_bundles(workspace_id) WHERE is_active;

ALTER TABLE public.partner_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_ws ON public.partner_bundles
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE TABLE public.partner_bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.partner_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  required_qty INTEGER NOT NULL DEFAULT 1 CHECK (required_qty > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, product_id)
);
CREATE INDEX idx_pbi_bundle ON public.partner_bundle_items(bundle_id);

ALTER TABLE public.partner_bundle_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY pbi_ws ON public.partner_bundle_items
  USING (EXISTS (SELECT 1 FROM public.partner_bundles b WHERE b.id = bundle_id AND (is_workspace_member(auth.uid(), b.workspace_id) OR is_super_admin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.partner_bundles b WHERE b.id = bundle_id AND (is_workspace_member(auth.uid(), b.workspace_id) OR is_super_admin(auth.uid()))));

-- 3. COUPONS
CREATE TABLE public.partner_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed','free_shipping')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  per_partner_limit INTEGER,
  first_order_only BOOLEAN NOT NULL DEFAULT false,
  applicable_partner_tier_id UUID REFERENCES public.partner_tiers(id) ON DELETE SET NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);
CREATE INDEX idx_pc_workspace ON public.partner_coupons(workspace_id) WHERE is_active;
CREATE INDEX idx_pc_code ON public.partner_coupons(workspace_id, lower(code)) WHERE is_active;

ALTER TABLE public.partner_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY pc_ws ON public.partner_coupons
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE TABLE public.partner_coupon_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  partner_account_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  partner_order_id UUID REFERENCES public.partner_order_headers(id) ON DELETE SET NULL,
  discount_amount NUMERIC(12,2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcr_coupon ON public.partner_coupon_redemptions(coupon_id);
CREATE INDEX idx_pcr_partner ON public.partner_coupon_redemptions(partner_account_id);

ALTER TABLE public.partner_coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pcr_read ON public.partner_coupon_redemptions FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));
-- INSERT only via SECURITY DEFINER RPC

-- 4. SHIPPING RULES
CREATE TABLE public.partner_shipping_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  free_shipping_threshold NUMERIC(12,2),
  flat_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_shipping_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY psr_ws ON public.partner_shipping_rules
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- 5. RECOVERY CONFIG
CREATE TABLE public.partner_recovery_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  first_delay_minutes INTEGER NOT NULL DEFAULT 240,   -- 4h
  second_delay_minutes INTEGER NOT NULL DEFAULT 1440, -- 24h
  third_delay_minutes INTEGER NOT NULL DEFAULT 4320,  -- 72h
  expire_after_days INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_recovery_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY prc_ws ON public.partner_recovery_config
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- 6. PARTNER CARTS (server-side persistent cart)
CREATE TABLE public.partner_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_account_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  partner_user_id UUID NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied_coupon_code TEXT,
  po_number TEXT,
  notes TEXT,
  subtotal_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  recovery_stage TEXT NOT NULL DEFAULT 'none' CHECK (recovery_stage IN ('none','first','second','third','recovered','expired')),
  recovery_token UUID NOT NULL DEFAULT gen_random_uuid(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcart_workspace ON public.partner_carts(workspace_id);
CREATE INDEX idx_pcart_partner ON public.partner_carts(partner_account_id);
CREATE INDEX idx_pcart_recovery ON public.partner_carts(last_activity_at, recovery_stage)
  WHERE recovery_stage NOT IN ('recovered','expired') AND jsonb_array_length(items) > 0;
CREATE INDEX idx_pcart_token ON public.partner_carts(recovery_token);

ALTER TABLE public.partner_carts ENABLE ROW LEVEL SECURITY;

-- Partner user owns their cart
CREATE POLICY pcart_owner ON public.partner_carts
  USING (partner_user_id = auth.uid())
  WITH CHECK (partner_user_id = auth.uid());

-- Workspace managers can read carts of their workspace
CREATE POLICY pcart_ws_read ON public.partner_carts FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- 7. FUNNEL EVENTS
CREATE TABLE public.partner_funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_account_id UUID REFERENCES public.partner_accounts(id) ON DELETE SET NULL,
  partner_user_id UUID,
  cart_id UUID REFERENCES public.partner_carts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.partner_order_headers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view_catalog','view_product','add_to_cart','remove_from_cart','view_cart',
    'start_checkout','apply_coupon','complete_order','cart_abandoned','cart_recovered',
    'recovery_email_sent','recovery_email_clicked'
  )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pfe_workspace_time ON public.partner_funnel_events(workspace_id, created_at DESC);
CREATE INDEX idx_pfe_event ON public.partner_funnel_events(workspace_id, event_type, created_at DESC);
CREATE INDEX idx_pfe_partner ON public.partner_funnel_events(partner_account_id, created_at DESC) WHERE partner_account_id IS NOT NULL;

ALTER TABLE public.partner_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY pfe_read ON public.partner_funnel_events FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));
CREATE POLICY pfe_partner_insert ON public.partner_funnel_events FOR INSERT
  WITH CHECK (
    partner_user_id = auth.uid()
    OR is_workspace_member(auth.uid(), workspace_id)
    OR is_super_admin(auth.uid())
  );

-- 8. EXTEND ORDER TABLES
ALTER TABLE public.partner_order_headers
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS recovered_from_cart_id UUID REFERENCES public.partner_carts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity_break_savings NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_savings NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.partner_order_items
  ADD COLUMN IF NOT EXISTS quantity_break_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES public.partner_bundles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_price_original NUMERIC(12,2);

-- 9. UPDATED_AT TRIGGERS
CREATE TRIGGER trg_pqb_updated_at BEFORE UPDATE ON public.partner_quantity_breaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pb_updated_at BEFORE UPDATE ON public.partner_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pc_updated_at BEFORE UPDATE ON public.partner_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_psr_updated_at BEFORE UPDATE ON public.partner_shipping_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prc_updated_at BEFORE UPDATE ON public.partner_recovery_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- partner_carts: bump last_activity_at + updated_at on every change
CREATE OR REPLACE FUNCTION public.partner_carts_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  -- Reset recovery if items changed
  IF TG_OP = 'UPDATE' AND OLD.items IS DISTINCT FROM NEW.items THEN
    NEW.last_activity_at := now();
    IF NEW.recovery_stage NOT IN ('recovered') THEN
      NEW.recovery_stage := 'none';
      NEW.abandoned_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pcart_touch BEFORE INSERT OR UPDATE ON public.partner_carts
  FOR EACH ROW EXECUTE FUNCTION public.partner_carts_touch();

-- ===========================================
-- RPCs (SSoT for cart computation)
-- ===========================================

-- Validate coupon (returns rejection reason or null)
CREATE OR REPLACE FUNCTION public.validate_partner_coupon(
  p_workspace_id UUID,
  p_partner_account_id UUID,
  p_code TEXT,
  p_subtotal NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.partner_coupons%ROWTYPE;
  v_account public.partner_accounts%ROWTYPE;
  v_uses_by_partner INTEGER;
  v_first_order BOOLEAN;
  v_discount NUMERIC := 0;
BEGIN
  SELECT * INTO v_coupon
    FROM public.partner_coupons
   WHERE workspace_id = p_workspace_id
     AND lower(code) = lower(p_code)
     AND is_active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF v_coupon.valid_from IS NOT NULL AND v_coupon.valid_from > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_yet_active');
  END IF;
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;
  IF p_subtotal < v_coupon.min_subtotal THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'min_subtotal_not_met', 'min_subtotal', v_coupon.min_subtotal);
  END IF;

  SELECT * INTO v_account FROM public.partner_accounts WHERE id = p_partner_account_id LIMIT 1;
  IF v_coupon.applicable_partner_tier_id IS NOT NULL
     AND v_account.partner_tier_id IS DISTINCT FROM v_coupon.applicable_partner_tier_id THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'tier_mismatch');
  END IF;

  IF v_coupon.per_partner_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_uses_by_partner
      FROM public.partner_coupon_redemptions
     WHERE coupon_id = v_coupon.id AND partner_account_id = p_partner_account_id;
    IF v_uses_by_partner >= v_coupon.per_partner_limit THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'per_partner_limit_reached');
    END IF;
  END IF;

  IF v_coupon.first_order_only THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.partner_order_headers
       WHERE partner_account_id = p_partner_account_id
         AND status NOT IN ('draft','cancelled','rejected')
    ) INTO v_first_order;
    IF NOT v_first_order THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'not_first_order');
    END IF;
  END IF;

  -- compute discount (free_shipping handled in cart totals)
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := round(p_subtotal * v_coupon.discount_value / 100.0, 2);
  ELSIF v_coupon.discount_type = 'fixed' THEN
    v_discount := least(v_coupon.discount_value, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'description', v_coupon.description
  );
END;
$$;

-- Compute cart totals: best-of-each (no stacking) per line, then coupon over remainder
CREATE OR REPLACE FUNCTION public.compute_partner_cart_totals(
  p_workspace_id UUID,
  p_partner_account_id UUID,
  p_items JSONB,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_lines JSONB := '[]'::jsonb;
  v_subtotal_original NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_qb_savings NUMERIC := 0;
  v_bundle_savings NUMERIC := 0;
  v_coupon_savings NUMERIC := 0;
  v_shipping NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_account public.partner_accounts%ROWTYPE;
  v_shipping_rule public.partner_shipping_rules%ROWTYPE;
  v_coupon_result JSONB;
  v_qb_pct NUMERIC;
  v_bundle_pct NUMERIC;
  v_best_pct NUMERIC;
  v_unit NUMERIC;
  v_qty INTEGER;
  v_pid UUID;
  v_line_total NUMERIC;
  v_line_savings NUMERIC;
  v_bundle_id UUID;
  v_free_shipping BOOLEAN := false;
BEGIN
  SELECT * INTO v_account FROM public.partner_accounts WHERE id = p_partner_account_id LIMIT 1;
  SELECT * INTO v_shipping_rule FROM public.partner_shipping_rules WHERE workspace_id = p_workspace_id LIMIT 1;

  -- Iterate items
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    v_unit := COALESCE((v_item->>'unit_price_net')::numeric, 0);

    IF v_qty <= 0 OR v_unit <= 0 THEN CONTINUE; END IF;

    -- Best quantity break for this product (active + qty meets min)
    SELECT MAX(discount_pct) INTO v_qb_pct
      FROM public.partner_quantity_breaks
     WHERE workspace_id = p_workspace_id
       AND is_active = true
       AND min_qty <= v_qty
       AND (valid_from IS NULL OR valid_from <= now())
       AND (valid_until IS NULL OR valid_until >= now())
       AND (
         product_id = v_pid
         OR (partner_tier_id IS NOT NULL AND partner_tier_id = v_account.partner_tier_id)
       );
    v_qb_pct := COALESCE(v_qb_pct, 0);

    -- Best bundle that this line belongs to (single-product bundles for now)
    SELECT b.id, CASE WHEN b.discount_type = 'percentage' THEN b.discount_value ELSE 0 END
      INTO v_bundle_id, v_bundle_pct
      FROM public.partner_bundles b
      JOIN public.partner_bundle_items bi ON bi.bundle_id = b.id
     WHERE b.workspace_id = p_workspace_id
       AND b.is_active = true
       AND (b.valid_from IS NULL OR b.valid_from <= now())
       AND (b.valid_until IS NULL OR b.valid_until >= now())
       AND bi.product_id = v_pid
       AND v_qty >= bi.required_qty
     ORDER BY b.discount_value DESC
     LIMIT 1;
    v_bundle_pct := COALESCE(v_bundle_pct, 0);

    -- Best of each (not stacking)
    v_best_pct := GREATEST(v_qb_pct, v_bundle_pct);

    v_line_total := round(v_unit * v_qty, 2);
    v_subtotal_original := v_subtotal_original + v_line_total;
    v_line_savings := round(v_line_total * v_best_pct / 100.0, 2);

    IF v_best_pct = v_qb_pct AND v_qb_pct > 0 THEN
      v_qb_savings := v_qb_savings + v_line_savings;
    ELSIF v_bundle_pct > 0 THEN
      v_bundle_savings := v_bundle_savings + v_line_savings;
    END IF;

    v_subtotal := v_subtotal + (v_line_total - v_line_savings);

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_pid,
      'quantity', v_qty,
      'unit_price_net', v_unit,
      'line_total_original', v_line_total,
      'discount_pct', v_best_pct,
      'discount_source', CASE
        WHEN v_best_pct = 0 THEN NULL
        WHEN v_best_pct = v_qb_pct AND v_qb_pct >= v_bundle_pct THEN 'quantity_break'
        ELSE 'bundle'
      END,
      'bundle_id', CASE WHEN v_best_pct = v_bundle_pct AND v_bundle_pct > 0 THEN v_bundle_id ELSE NULL END,
      'line_total_net', round(v_line_total - v_line_savings, 2)
    );
  END LOOP;

  -- Coupon (over net subtotal after line discounts)
  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    v_coupon_result := public.validate_partner_coupon(p_workspace_id, p_partner_account_id, p_coupon_code, v_subtotal);
    IF (v_coupon_result->>'valid')::boolean THEN
      IF v_coupon_result->>'discount_type' = 'free_shipping' THEN
        v_free_shipping := true;
      ELSE
        v_coupon_savings := COALESCE((v_coupon_result->>'discount_amount')::numeric, 0);
        v_subtotal := v_subtotal - v_coupon_savings;
      END IF;
    END IF;
  END IF;

  -- Shipping
  IF v_shipping_rule.id IS NOT NULL AND v_shipping_rule.is_active THEN
    IF v_free_shipping
       OR (v_shipping_rule.free_shipping_threshold IS NOT NULL
           AND v_subtotal >= v_shipping_rule.free_shipping_threshold) THEN
      v_shipping := 0;
    ELSE
      v_shipping := COALESCE(v_shipping_rule.flat_rate, 0);
    END IF;
  END IF;

  v_tax := round((v_subtotal + v_shipping) * 0.23, 2);

  RETURN jsonb_build_object(
    'lines', v_lines,
    'subtotal_original', round(v_subtotal_original, 2),
    'subtotal_net', round(v_subtotal, 2),
    'quantity_break_savings', round(v_qb_savings, 2),
    'bundle_savings', round(v_bundle_savings, 2),
    'coupon_savings', round(v_coupon_savings, 2),
    'total_savings', round(v_qb_savings + v_bundle_savings + v_coupon_savings, 2),
    'shipping_amount', round(v_shipping, 2),
    'tax_amount', v_tax,
    'total_gross', round(v_subtotal + v_shipping + v_tax, 2),
    'free_shipping_threshold', v_shipping_rule.free_shipping_threshold,
    'free_shipping_remaining', GREATEST(0, COALESCE(v_shipping_rule.free_shipping_threshold, 0) - v_subtotal),
    'coupon', v_coupon_result
  );
END;
$$;

-- Recommendations: co-occurrence in past orders + fallback to same category
CREATE OR REPLACE FUNCTION public.get_partner_recommendations(
  p_partner_account_id UUID,
  p_current_product_ids UUID[],
  p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (product_id UUID, score NUMERIC, reason TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH co_occur AS (
    SELECT oi2.product_id, COUNT(*)::numeric AS score
      FROM public.partner_order_items oi1
      JOIN public.partner_order_items oi2 ON oi1.partner_order_id = oi2.partner_order_id
      JOIN public.partner_order_headers h ON h.id = oi1.partner_order_id
     WHERE h.partner_account_id = p_partner_account_id
       AND oi1.product_id = ANY(p_current_product_ids)
       AND oi2.product_id <> ALL(p_current_product_ids)
     GROUP BY oi2.product_id
     ORDER BY score DESC
     LIMIT p_limit
  )
  SELECT c.product_id, c.score, 'frequently_bought'::text FROM co_occur c;
END;
$$;

-- Restore cart by token (called from /partner/cart?recover=...)
CREATE OR REPLACE FUNCTION public.restore_partner_cart_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart public.partner_carts%ROWTYPE;
BEGIN
  SELECT * INTO v_cart FROM public.partner_carts WHERE recovery_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;
  IF v_cart.partner_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  UPDATE public.partner_carts
     SET recovery_stage = 'recovered',
         recovered_at = now()
   WHERE id = v_cart.id;

  INSERT INTO public.partner_funnel_events (workspace_id, partner_account_id, partner_user_id, cart_id, event_type, payload)
  VALUES (v_cart.workspace_id, v_cart.partner_account_id, v_cart.partner_user_id, v_cart.id, 'cart_recovered', jsonb_build_object('token', p_token));

  RETURN jsonb_build_object(
    'ok', true,
    'items', v_cart.items,
    'applied_coupon_code', v_cart.applied_coupon_code,
    'po_number', v_cart.po_number,
    'notes', v_cart.notes,
    'cart_id', v_cart.id
  );
END;
$$;

-- Atomic coupon redemption (called from order submission)
CREATE OR REPLACE FUNCTION public.redeem_partner_coupon(
  p_workspace_id UUID,
  p_partner_account_id UUID,
  p_order_id UUID,
  p_code TEXT,
  p_discount_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon_id UUID;
BEGIN
  UPDATE public.partner_coupons
     SET uses_count = uses_count + 1,
         updated_at = now()
   WHERE workspace_id = p_workspace_id
     AND lower(code) = lower(p_code)
     AND is_active = true
     AND (max_uses IS NULL OR uses_count < max_uses)
   RETURNING id INTO v_coupon_id;

  IF v_coupon_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.partner_coupon_redemptions
    (coupon_id, workspace_id, partner_account_id, partner_order_id, discount_amount)
  VALUES (v_coupon_id, p_workspace_id, p_partner_account_id, p_order_id, p_discount_amount);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_partner_coupon(UUID, UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_partner_cart_totals(UUID, UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_recommendations(UUID, UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_partner_cart_by_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_partner_coupon(UUID, UUID, UUID, TEXT, NUMERIC) TO authenticated;
