
-- 1. Stock management columns on products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false;

-- 2. Store categories table
CREATE TABLE public.store_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view store categories" ON public.store_categories
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage store categories" ON public.store_categories
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Public read for store front
CREATE POLICY "Public can view active store categories" ON public.store_categories
  FOR SELECT USING (is_active = true);

-- 3. Add category FK to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS store_category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_store_category ON public.products(store_category_id);

-- 4. Store coupons table
CREATE TABLE public.store_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage store coupons" ON public.store_coupons
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Public validation (read only active coupons)
CREATE POLICY "Public can validate active coupons" ON public.store_coupons
  FOR SELECT USING (is_active = true);

-- 5. Add coupon reference to store_orders
ALTER TABLE public.store_orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.store_coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
