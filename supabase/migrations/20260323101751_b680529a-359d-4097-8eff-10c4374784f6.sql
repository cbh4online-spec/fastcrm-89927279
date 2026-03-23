
-- ═══════════════════════════════════════════
-- TABELA: price_lists (listas de preços)
-- ═══════════════════════════════════════════
CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'EUR',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_lists_workspace ON public.price_lists(workspace_id, is_active);
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.price_lists
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════
-- TABELA: price_list_items (preço por produto por lista)
-- ═══════════════════════════════════════════
CREATE TABLE public.price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  margin_percent NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(price_list_id, product_id, min_quantity)
);

CREATE INDEX idx_price_list_items_lookup ON public.price_list_items(price_list_id, product_id);
CREATE INDEX idx_price_list_items_product ON public.price_list_items(product_id);
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.price_list_items
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════
-- TABELA: price_rules (descontos por volume, cliente, categoria)
-- ═══════════════════════════════════════════
CREATE TABLE public.price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('volume_discount', 'client_discount', 'category_discount', 'special_price')),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,

  -- Scope filters (nullable = applies to all)
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category TEXT,
  price_list_id UUID REFERENCES public.price_lists(id) ON DELETE CASCADE,

  -- Discount config
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'fixed_price')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,

  -- Validity
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_rules_workspace ON public.price_rules(workspace_id, is_active);
CREATE INDEX idx_price_rules_contact ON public.price_rules(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_price_rules_company ON public.price_rules(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_price_rules_product ON public.price_rules(product_id) WHERE product_id IS NOT NULL;
ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON public.price_rules
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════
-- Adicionar price_list_id a contacts e companies
-- ═══════════════════════════════════════════
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id) ON DELETE SET NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id) ON DELETE SET NULL;
