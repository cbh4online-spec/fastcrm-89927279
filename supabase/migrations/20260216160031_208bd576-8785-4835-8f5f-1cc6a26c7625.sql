
-- ============================================
-- FastCRM Funnel OS: Verticals, Variations, Products
-- ============================================

-- 1. Create verticals table
CREATE TABLE public.verticals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color_theme TEXT DEFAULT '#6366f1',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view verticals" ON public.verticals
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create verticals" ON public.verticals
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update verticals" ON public.verticals
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete verticals" ON public.verticals
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 2. Add vertical_id and type to funnels
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS vertical_id UUID REFERENCES public.verticals(id) ON DELETE SET NULL;
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'leadgen';

-- 3. Create funnel_variations table
CREATE TABLE public.funnel_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  traffic_percentage INTEGER NOT NULL DEFAULT 50,
  is_control BOOLEAN NOT NULL DEFAULT false,
  content JSONB DEFAULT '{}',
  conversion_rate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view variations" ON public.funnel_variations
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create variations" ON public.funnel_variations
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update variations" ON public.funnel_variations
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete variations" ON public.funnel_variations
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 4. Create funnel_products table
CREATE TABLE public.funnel_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT 'main',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view funnel products" ON public.funnel_products
  FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can create funnel products" ON public.funnel_products
  FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update funnel products" ON public.funnel_products
  FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete funnel products" ON public.funnel_products
  FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 5. Add vertical_id to vertical_templates
ALTER TABLE public.vertical_templates ADD COLUMN IF NOT EXISTS vertical_id UUID REFERENCES public.verticals(id) ON DELETE SET NULL;

-- 6. Indexes
CREATE INDEX idx_verticals_workspace ON public.verticals(workspace_id);
CREATE INDEX idx_funnels_vertical ON public.funnels(vertical_id);
CREATE INDEX idx_funnel_variations_step ON public.funnel_variations(step_id);
CREATE INDEX idx_funnel_products_funnel ON public.funnel_products(funnel_id);

-- 7. Trigger for updated_at on verticals
CREATE TRIGGER update_verticals_updated_at
  BEFORE UPDATE ON public.verticals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnel_variations_updated_at
  BEFORE UPDATE ON public.funnel_variations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
