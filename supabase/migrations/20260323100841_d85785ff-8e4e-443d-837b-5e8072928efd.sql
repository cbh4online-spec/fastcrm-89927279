
-- ═══════════════════════════════════════════
-- TABELA: product_spec_attributes (specs técnicas key-value)
-- ═══════════════════════════════════════════
CREATE TABLE public.product_spec_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  spec_key TEXT NOT NULL,
  spec_value TEXT NOT NULL,
  unit TEXT,
  spec_group TEXT DEFAULT 'Geral',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_specs_product ON public.product_spec_attributes(product_id);
CREATE INDEX idx_product_specs_workspace ON public.product_spec_attributes(workspace_id, product_id);
CREATE INDEX idx_product_specs_group ON public.product_spec_attributes(product_id, spec_group);

ALTER TABLE public.product_spec_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.product_spec_attributes
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════
-- TABELA: spec_attribute_templates (templates por categoria)
-- ═══════════════════════════════════════════
CREATE TABLE public.spec_attribute_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  category TEXT,
  spec_keys JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.spec_attribute_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON public.spec_attribute_templates
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));
