
-- ============================
-- Shipping Methods & Zones
-- ============================

-- Shipping methods table (configurable per workspace)
CREATE TABLE public.shipping_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Base price (used when no zone matches)
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Free shipping threshold (null = no free shipping)
  free_shipping_threshold NUMERIC(10,2),
  -- Estimated delivery
  estimated_delivery TEXT, -- e.g. "2-3 dias úteis"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shipping zones (geographic pricing rules)
CREATE TABLE public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Portugal Continental", "Ilhas", "Europa"
  countries TEXT[] NOT NULL DEFAULT '{}', -- ISO country codes: PT, ES, FR...
  -- Weight-based pricing rules (jsonb array)
  -- Format: [{ "min_weight": 0, "max_weight": 5, "price": 3.50 }, ...]
  weight_rules JSONB NOT NULL DEFAULT '[]',
  -- Flat price if no weight rules
  flat_price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add shipping + tracking fields to store_orders
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS shipping_method_id UUID REFERENCES public.shipping_methods(id),
  ADD COLUMN IF NOT EXISTS shipping_method_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_weight NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_added_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

-- RLS for shipping_methods
CREATE POLICY "Public can view active shipping methods"
  ON public.shipping_methods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Workspace members manage shipping methods"
  ON public.shipping_methods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = shipping_methods.workspace_id
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = shipping_methods.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- RLS for shipping_zones
CREATE POLICY "Public can view active shipping zones"
  ON public.shipping_zones FOR SELECT
  USING (is_active = true);

CREATE POLICY "Workspace members manage shipping zones"
  ON public.shipping_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = shipping_zones.workspace_id
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = shipping_zones.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Add weight field to products for shipping calculation
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight NUMERIC(10,3);

-- Trigger for updated_at on shipping_methods
CREATE TRIGGER update_shipping_methods_updated_at
  BEFORE UPDATE ON public.shipping_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_shipping_methods_workspace ON public.shipping_methods(workspace_id, is_active);
CREATE INDEX idx_shipping_zones_method ON public.shipping_zones(shipping_method_id, is_active);
CREATE INDEX idx_store_orders_tracking ON public.store_orders(tracking_number) WHERE tracking_number IS NOT NULL;
