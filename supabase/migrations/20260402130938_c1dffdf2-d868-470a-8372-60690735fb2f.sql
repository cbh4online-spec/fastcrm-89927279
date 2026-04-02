
-- =============================================
-- PARTNER CENTER B2B — P0 SCHEMA
-- =============================================

-- ENUMS
CREATE TYPE public.partner_account_status AS ENUM ('lead','invited','active','suspended','blocked');
CREATE TYPE public.partner_user_role AS ENUM ('partner_owner','partner_admin','partner_buyer','partner_finance','partner_approver','partner_viewer');
CREATE TYPE public.partner_order_status AS ENUM (
  'draft','submitted','awaiting_approval','approved','rejected',
  'processing','shipped','completed','cancelled'
);

-- 1. PARTNER TIERS
CREATE TABLE public.partner_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  rebate_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  min_quarter_volume NUMERIC(12,2) DEFAULT 0,
  min_annual_volume NUMERIC(12,2) DEFAULT 0,
  benefits_json JSONB DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, code)
);

-- 2. PARTNER PRICE LISTS
CREATE TABLE public.partner_price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'b2b',
  currency TEXT NOT NULL DEFAULT 'EUR',
  pricing_mode TEXT NOT NULL DEFAULT 'fixed_net',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PARTNER ACCOUNTS
CREATE TABLE public.partner_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  vat_number TEXT,
  business_type TEXT DEFAULT 'other',
  status public.partner_account_status NOT NULL DEFAULT 'lead',
  country TEXT DEFAULT 'PT',
  currency TEXT DEFAULT 'EUR',
  language TEXT DEFAULT 'pt',
  owner_contact_id UUID,
  assigned_sales_owner_id UUID,
  assigned_channel_manager_id UUID,
  price_list_id UUID REFERENCES public.partner_price_lists(id) ON DELETE SET NULL,
  partner_tier_id UUID REFERENCES public.partner_tiers(id) ON DELETE SET NULL,
  payment_terms TEXT DEFAULT 'net_30',
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_credit_exposure NUMERIC(12,2) DEFAULT 0,
  allow_checkout BOOLEAN NOT NULL DEFAULT true,
  requires_order_approval BOOLEAN NOT NULL DEFAULT false,
  approval_threshold NUMERIC(12,2),
  allow_backorders BOOLEAN NOT NULL DEFAULT false,
  storefront_enabled BOOLEAN NOT NULL DEFAULT false,
  storefront_slug TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, account_code)
);

-- 4. PARTNER USERS (must exist before is_partner_member function)
CREATE TABLE public.partner_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_account_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role public.partner_user_role NOT NULL DEFAULT 'partner_buyer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, partner_account_id, auth_user_id)
);

-- Helper function (now partner_users exists)
CREATE OR REPLACE FUNCTION public.is_partner_member(p_user_id UUID, p_partner_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_users
    WHERE auth_user_id = p_user_id
      AND partner_account_id = p_partner_account_id
      AND is_active = true
  );
$$;

-- 5. PARTNER PRICE LIST ITEMS
CREATE TABLE public.partner_price_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price_list_id UUID NOT NULL REFERENCES public.partner_price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  price_net NUMERIC(12,2) NOT NULL,
  pvp_recommended NUMERIC(12,2),
  min_qty INTEGER DEFAULT 1,
  pack_size INTEGER DEFAULT 1,
  moq INTEGER DEFAULT 1,
  max_discount_allowed NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, product_id)
);

-- 6. PARTNER ORDER HEADERS
CREATE TABLE public.partner_order_headers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_account_id UUID NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status public.partner_order_status NOT NULL DEFAULT 'draft',
  po_number TEXT,
  buyer_user_id UUID,
  approver_user_id UUID,
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_terms_snapshot TEXT,
  shipping_address_snapshot JSONB,
  billing_address_snapshot JSONB,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'partner_center',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, order_number)
);

-- 7. PARTNER ORDER ITEMS
CREATE TABLE public.partner_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_order_id UUID NOT NULL REFERENCES public.partner_order_headers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  sku TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_net NUMERIC(12,2) NOT NULL,
  pvp_recommended NUMERIC(12,2),
  margin_estimated NUMERIC(5,2),
  tax_rate NUMERIC(5,2) DEFAULT 0,
  line_total_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  pack_size INTEGER DEFAULT 1,
  moq_applied INTEGER DEFAULT 1,
  fulfillment_mode TEXT DEFAULT 'own_stock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PARTNER ACTIVITY LOGS
CREATE TABLE public.partner_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  partner_account_id UUID REFERENCES public.partner_accounts(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'user',
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_order_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_activity_logs ENABLE ROW LEVEL SECURITY;

-- PARTNER TIERS
CREATE POLICY "partner_tiers_ws" ON public.partner_tiers FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);

-- PARTNER PRICE LISTS
CREATE POLICY "partner_price_lists_ws" ON public.partner_price_lists FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);

-- PARTNER ACCOUNTS: workspace manages, partners read own
CREATE POLICY "partner_accounts_ws" ON public.partner_accounts FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);
CREATE POLICY "partner_accounts_self" ON public.partner_accounts FOR SELECT USING (
  public.is_partner_member(auth.uid(), id)
);

-- PARTNER USERS: workspace manages, partner reads own account members, user reads self
CREATE POLICY "partner_users_ws" ON public.partner_users FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);
CREATE POLICY "partner_users_self" ON public.partner_users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "partner_users_account" ON public.partner_users FOR SELECT USING (
  public.is_partner_member(auth.uid(), partner_account_id)
);

-- PARTNER PRICE LIST ITEMS: workspace manages, partner reads their list
CREATE POLICY "partner_pli_ws" ON public.partner_price_list_items FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);
CREATE POLICY "partner_pli_partner" ON public.partner_price_list_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.partner_accounts pa
    JOIN public.partner_users pu ON pu.partner_account_id = pa.id
    WHERE pu.auth_user_id = auth.uid() AND pu.is_active = true
      AND pa.price_list_id = partner_price_list_items.price_list_id
  )
);

-- PARTNER ORDER HEADERS: workspace manages all, partner CRUD own
CREATE POLICY "partner_orders_ws" ON public.partner_order_headers FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);
CREATE POLICY "partner_orders_read" ON public.partner_order_headers FOR SELECT USING (
  public.is_partner_member(auth.uid(), partner_account_id)
);
CREATE POLICY "partner_orders_insert" ON public.partner_order_headers FOR INSERT WITH CHECK (
  public.is_partner_member(auth.uid(), partner_account_id)
);
CREATE POLICY "partner_orders_update" ON public.partner_order_headers FOR UPDATE USING (
  public.is_partner_member(auth.uid(), partner_account_id) AND status IN ('draft','submitted')
);

-- PARTNER ORDER ITEMS: workspace manages, partner reads/inserts own
CREATE POLICY "partner_oi_ws" ON public.partner_order_items FOR ALL USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);
CREATE POLICY "partner_oi_read" ON public.partner_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partner_order_headers h WHERE h.id = partner_order_items.partner_order_id AND public.is_partner_member(auth.uid(), h.partner_account_id))
);
CREATE POLICY "partner_oi_insert" ON public.partner_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.partner_order_headers h WHERE h.id = partner_order_items.partner_order_id AND public.is_partner_member(auth.uid(), h.partner_account_id))
);

-- PARTNER ACTIVITY LOGS: workspace reads only (writes via service_role)
CREATE POLICY "partner_logs_read" ON public.partner_activity_logs FOR SELECT USING (
  public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid())
);

-- =============================================
-- PRODUCT B2B FIELDS
-- =============================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS b2b_visible BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS b2b_sellable BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pvp_recommended NUMERIC(12,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS moq INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allow_backorder BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS partner_notes TEXT;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_partner_accounts_workspace ON public.partner_accounts(workspace_id);
CREATE INDEX idx_partner_accounts_status ON public.partner_accounts(workspace_id, status);
CREATE INDEX idx_partner_users_auth ON public.partner_users(auth_user_id);
CREATE INDEX idx_partner_users_account ON public.partner_users(partner_account_id);
CREATE INDEX idx_partner_pli_list ON public.partner_price_list_items(price_list_id);
CREATE INDEX idx_partner_pli_product ON public.partner_price_list_items(product_id);
CREATE INDEX idx_partner_orders_account ON public.partner_order_headers(partner_account_id);
CREATE INDEX idx_partner_orders_status ON public.partner_order_headers(workspace_id, status);
CREATE INDEX idx_partner_order_items_order ON public.partner_order_items(partner_order_id);
CREATE INDEX idx_partner_logs_account ON public.partner_activity_logs(partner_account_id);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER update_partner_tiers_updated_at BEFORE UPDATE ON public.partner_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_price_lists_updated_at BEFORE UPDATE ON public.partner_price_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_accounts_updated_at BEFORE UPDATE ON public.partner_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_users_updated_at BEFORE UPDATE ON public.partner_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_pli_updated_at BEFORE UPDATE ON public.partner_price_list_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_orders_updated_at BEFORE UPDATE ON public.partner_order_headers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PRICING ENGINE RPC
-- =============================================

CREATE OR REPLACE FUNCTION public.compute_partner_price(
  p_workspace_id UUID,
  p_product_id UUID,
  p_partner_account_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(
  base_price NUMERIC,
  price_net NUMERIC,
  price_source TEXT,
  pvp_recommended NUMERIC,
  gross_margin_pct NUMERIC,
  tier_applied TEXT,
  list_applied TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_base_price NUMERIC;
  v_price_net NUMERIC;
  v_price_source TEXT := 'base';
  v_pvp NUMERIC;
  v_margin NUMERIC;
  v_tier_name TEXT;
  v_list_name TEXT;
  v_list_id UUID;
  v_tier_id UUID;
  v_tier_discount NUMERIC;
BEGIN
  SELECT p.price, p.pvp_recommended INTO v_base_price, v_pvp
  FROM products p WHERE p.id = p_product_id AND p.workspace_id = p_workspace_id;

  IF v_base_price IS NULL THEN RETURN; END IF;
  v_price_net := v_base_price;

  SELECT pa.price_list_id, pa.partner_tier_id INTO v_list_id, v_tier_id
  FROM partner_accounts pa WHERE pa.id = p_partner_account_id AND pa.workspace_id = p_workspace_id;

  -- 1. Price list item (highest priority)
  IF v_list_id IS NOT NULL THEN
    SELECT pli.price_net, pli.pvp_recommended, pl.name
    INTO v_price_net, v_pvp, v_list_name
    FROM partner_price_list_items pli
    JOIN partner_price_lists pl ON pl.id = pli.price_list_id
    WHERE pli.price_list_id = v_list_id AND pli.product_id = p_product_id
      AND pli.is_active = true AND pli.workspace_id = p_workspace_id
      AND (pli.valid_from IS NULL OR pli.valid_from <= now())
      AND (pli.valid_until IS NULL OR pli.valid_until >= now())
      AND p_quantity >= COALESCE(pli.min_qty, 1);
    IF FOUND THEN v_price_source := 'price_list'; END IF;
  END IF;

  -- 2. Tier discount fallback
  IF v_price_source = 'base' AND v_tier_id IS NOT NULL THEN
    SELECT pt.discount_percentage, pt.name INTO v_tier_discount, v_tier_name
    FROM partner_tiers pt WHERE pt.id = v_tier_id AND pt.is_active = true;
    IF v_tier_discount IS NOT NULL AND v_tier_discount > 0 THEN
      v_price_net := ROUND(v_base_price * (1 - v_tier_discount / 100), 2);
      v_price_source := 'tier_discount';
    END IF;
  END IF;

  IF v_tier_id IS NOT NULL AND v_tier_name IS NULL THEN
    SELECT pt.name INTO v_tier_name FROM partner_tiers pt WHERE pt.id = v_tier_id;
  END IF;

  IF v_pvp IS NOT NULL AND v_pvp > 0 THEN
    v_margin := ROUND(((v_pvp - v_price_net) / v_pvp) * 100, 2);
  END IF;

  RETURN QUERY SELECT v_base_price, v_price_net, v_price_source, v_pvp, v_margin, v_tier_name, v_list_name;
END;
$$;
