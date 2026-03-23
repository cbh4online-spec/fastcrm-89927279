
-- ════════════════════════════════════════════════════
-- TABELA: product_stock_locations (armazéns/localizações)
-- ════════════════════════════════════════════════════
CREATE TABLE public.product_stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stock_locations_workspace ON product_stock_locations(workspace_id);
ALTER TABLE product_stock_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON product_stock_locations
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ════════════════════════════════════════════════════
-- TABELA: product_stock_movements (entradas, saídas, ajustes, reservas)
-- ════════════════════════════════════════════════════
CREATE TABLE public.product_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.product_stock_locations(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'reserve', 'release', 'transfer', 'return')),
  quantity INTEGER NOT NULL,
  reason TEXT CHECK (reason IN ('purchase', 'sale', 'manual_adjustment', 'damage', 'theft', 'return', 'correction', 'proposal_reserve', 'order_reserve', 'production', 'transfer', 'other')),
  reference_type TEXT,
  reference_id TEXT,
  notes TEXT,
  unit_cost NUMERIC(12,2),
  balance_after INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON product_stock_movements(workspace_id, product_id, created_at DESC);
CREATE INDEX idx_stock_movements_ref ON product_stock_movements(reference_type, reference_id) WHERE reference_id IS NOT NULL;
ALTER TABLE product_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON product_stock_movements
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ════════════════════════════════════════════════════
-- Adicionar campos de stock ao products (se não existirem)
-- ════════════════════════════════════════════════════
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS stock_location_id UUID REFERENCES public.product_stock_locations(id) ON DELETE SET NULL;
