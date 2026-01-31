-- =====================================================
-- FASE 1: CAMADA COMERCIAL
-- Kits/Protocolos, Cross-sell, Escalões de Preço
-- =====================================================

-- 1.1 SISTEMA DE KITS/PROTOCOLOS
-- =====================================================

-- Tabela principal de protocolos (bundles comerciais)
CREATE TABLE public.product_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  short_description text,
  image_url text,
  is_active boolean DEFAULT true,
  discount_percentage numeric(5,2) DEFAULT 0,
  category text,
  tags text[],
  position integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, code)
);

-- Produtos dentro de cada protocolo (N:M)
CREATE TABLE public.protocol_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.product_protocols(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  is_optional boolean DEFAULT false,
  notes text,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(protocol_id, product_id)
);

-- Índices
CREATE INDEX idx_product_protocols_workspace ON public.product_protocols(workspace_id);
CREATE INDEX idx_product_protocols_active ON public.product_protocols(workspace_id, is_active);
CREATE INDEX idx_protocol_products_protocol ON public.protocol_products(protocol_id);
CREATE INDEX idx_protocol_products_product ON public.protocol_products(product_id);

-- RLS para product_protocols
ALTER TABLE public.product_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocols for their workspace"
  ON public.product_protocols FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage protocols"
  ON public.product_protocols FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS para protocol_products
ALTER TABLE public.protocol_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol products"
  ON public.protocol_products FOR SELECT
  USING (
    protocol_id IN (
      SELECT id FROM public.product_protocols 
      WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage protocol products"
  ON public.protocol_products FOR ALL
  USING (
    protocol_id IN (
      SELECT id FROM public.product_protocols 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
    OR public.is_super_admin(auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER update_product_protocols_updated_at
  BEFORE UPDATE ON public.product_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 1.2 RECOMENDAÇÕES DE COMPLEMENTOS (CROSS-SELL)
-- =====================================================

CREATE TABLE public.product_cross_sells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  weight integer DEFAULT 1,
  reason text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, source_product_id, target_product_id),
  CHECK (source_product_id != target_product_id)
);

-- Índices
CREATE INDEX idx_product_cross_sells_source ON public.product_cross_sells(source_product_id);
CREATE INDEX idx_product_cross_sells_workspace ON public.product_cross_sells(workspace_id);

-- RLS
ALTER TABLE public.product_cross_sells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cross-sells for their workspace"
  ON public.product_cross_sells FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage cross-sells"
  ON public.product_cross_sells FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );


-- 1.3 ESCALÕES DE PREÇO POR CLIENTE
-- =====================================================

-- Tabela de escalões (tiers)
CREATE TABLE public.client_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  discount_percentage numeric(5,2) DEFAULT 0,
  color text DEFAULT '#6366f1',
  priority integer DEFAULT 0,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, code)
);

-- Preços específicos por produto e tier
CREATE TABLE public.product_tier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.client_price_tiers(id) ON DELETE CASCADE,
  price_net numeric(12,2) NOT NULL,
  is_active boolean DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, tier_id)
);

-- Extensão client_users para associar tier
ALTER TABLE public.client_users
ADD COLUMN IF NOT EXISTS price_tier_id uuid REFERENCES public.client_price_tiers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS business_type text;

-- Índices
CREATE INDEX idx_client_price_tiers_workspace ON public.client_price_tiers(workspace_id);
CREATE INDEX idx_product_tier_prices_product ON public.product_tier_prices(product_id);
CREATE INDEX idx_product_tier_prices_tier ON public.product_tier_prices(tier_id);
CREATE INDEX idx_client_users_tier ON public.client_users(price_tier_id);

-- RLS para client_price_tiers
ALTER TABLE public.client_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tiers for their workspace"
  ON public.client_price_tiers FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage tiers"
  ON public.client_price_tiers FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS para product_tier_prices
ALTER TABLE public.product_tier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tier prices for their workspace"
  ON public.product_tier_prices FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage tier prices"
  ON public.product_tier_prices FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Trigger updated_at
CREATE TRIGGER update_client_price_tiers_updated_at
  BEFORE UPDATE ON public.client_price_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.product_protocols IS 'Kits/Protocolos comerciais (bundles de produtos)';
COMMENT ON TABLE public.protocol_products IS 'Produtos incluídos em cada protocolo';
COMMENT ON TABLE public.product_cross_sells IS 'Relações de cross-sell entre produtos';
COMMENT ON TABLE public.client_price_tiers IS 'Escalões de preço (Gold, Silver, Bronze, etc.)';
COMMENT ON TABLE public.product_tier_prices IS 'Preços específicos por produto e escalão';
COMMENT ON COLUMN public.client_users.business_type IS 'Tipo de negócio: Cabeleireiro, Clínica, Terapeuta, etc.';