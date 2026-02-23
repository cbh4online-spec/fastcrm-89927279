
-- Enum for kit levels
CREATE TYPE public.kit_level AS ENUM ('basic', 'advanced', 'custom');

-- Pathologies catalog
CREATE TABLE public.pathologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_pathologies_workspace_slug ON public.pathologies(workspace_id, slug);
CREATE INDEX idx_pathologies_workspace_active ON public.pathologies(workspace_id, is_active);

ALTER TABLE public.pathologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pathologies in their workspace"
  ON public.pathologies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = pathologies.workspace_id AND wm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.workspace_id = pathologies.workspace_id AND cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage pathologies"
  ON public.pathologies FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = pathologies.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- Pathology-Protocol junction
CREATE TABLE public.pathology_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathology_id UUID NOT NULL REFERENCES public.pathologies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.product_protocols(id) ON DELETE CASCADE,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pathology_id, protocol_id)
);

CREATE INDEX idx_pathology_protocols_pathology ON public.pathology_protocols(pathology_id);
CREATE INDEX idx_pathology_protocols_protocol ON public.pathology_protocols(protocol_id);

ALTER TABLE public.pathology_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pathology_protocols"
  ON public.pathology_protocols FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pathologies p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = pathology_protocols.pathology_id AND wm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.pathologies p
      JOIN public.client_users cu ON cu.workspace_id = p.workspace_id
      WHERE p.id = pathology_protocols.pathology_id AND cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage pathology_protocols"
  ON public.pathology_protocols FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pathologies p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = pathology_protocols.pathology_id AND wm.user_id = auth.uid()
    )
  );

-- Protocol Kits
CREATE TABLE public.protocol_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.product_protocols(id) ON DELETE CASCADE,
  kit_name TEXT NOT NULL,
  kit_level public.kit_level NOT NULL DEFAULT 'basic',
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_protocol_kits_protocol ON public.protocol_kits(protocol_id);

ALTER TABLE public.protocol_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read protocol_kits"
  ON public.protocol_kits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_protocols pp
      JOIN public.workspace_members wm ON wm.workspace_id = pp.workspace_id
      WHERE pp.id = protocol_kits.protocol_id AND wm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.product_protocols pp
      JOIN public.client_users cu ON cu.workspace_id = pp.workspace_id
      WHERE pp.id = protocol_kits.protocol_id AND cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage protocol_kits"
  ON public.protocol_kits FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_protocols pp
      JOIN public.workspace_members wm ON wm.workspace_id = pp.workspace_id
      WHERE pp.id = protocol_kits.protocol_id AND wm.user_id = auth.uid()
    )
  );

-- Protocol Kit Items
CREATE TABLE public.protocol_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.protocol_kits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  suggested_qty INTEGER NOT NULL DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_protocol_kit_items_kit ON public.protocol_kit_items(kit_id);

ALTER TABLE public.protocol_kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read protocol_kit_items"
  ON public.protocol_kit_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocol_kits pk
      JOIN public.product_protocols pp ON pp.id = pk.protocol_id
      JOIN public.workspace_members wm ON wm.workspace_id = pp.workspace_id
      WHERE pk.id = protocol_kit_items.kit_id AND wm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.protocol_kits pk
      JOIN public.product_protocols pp ON pp.id = pk.protocol_id
      JOIN public.client_users cu ON cu.workspace_id = pp.workspace_id
      WHERE pk.id = protocol_kit_items.kit_id AND cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can manage protocol_kit_items"
  ON public.protocol_kit_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.protocol_kits pk
      JOIN public.product_protocols pp ON pp.id = pk.protocol_id
      JOIN public.workspace_members wm ON wm.workspace_id = pp.workspace_id
      WHERE pk.id = protocol_kit_items.kit_id AND wm.user_id = auth.uid()
    )
  );

-- Client Consumption Analytics
CREATE TABLE public.client_consumption_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  period_month DATE NOT NULL,
  category TEXT,
  line TEXT,
  pathology TEXT,
  total_qty INTEGER DEFAULT 0,
  total_value_net NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_client_consumption_company_period ON public.client_consumption_analytics(company_id, period_month);
CREATE INDEX idx_client_consumption_workspace ON public.client_consumption_analytics(workspace_id);

ALTER TABLE public.client_consumption_analytics ENABLE ROW LEVEL SECURITY;

-- Security definer function for company access
CREATE OR REPLACE FUNCTION public.get_client_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.client_users WHERE auth_user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Client users can read their company consumption"
  ON public.client_consumption_analytics FOR SELECT TO authenticated
  USING (
    company_id = public.get_client_company_id(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = client_consumption_analytics.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- Client Product Rankings
CREATE TABLE public.client_product_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  period_days INTEGER NOT NULL DEFAULT 30,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  total_qty INTEGER DEFAULT 0,
  total_value_net NUMERIC(12,2) DEFAULT 0,
  last_purchased_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_client_rankings_company_period ON public.client_product_rankings(company_id, period_days);
CREATE INDEX idx_client_rankings_workspace ON public.client_product_rankings(workspace_id);

ALTER TABLE public.client_product_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users can read their company rankings"
  ON public.client_product_rankings FOR SELECT TO authenticated
  USING (
    company_id = public.get_client_company_id(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = client_product_rankings.workspace_id AND wm.user_id = auth.uid()
    )
  );
