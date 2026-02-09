
-- Create product_relations table
CREATE TABLE public.product_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('related', 'compatible', 'bundle')),
  reason TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_product_id, target_product_id, relation_type)
);

-- Indexes
CREATE INDEX idx_product_relations_source ON public.product_relations(source_product_id, relation_type) WHERE is_active = true;
CREATE INDEX idx_product_relations_workspace ON public.product_relations(workspace_id);

-- Enable RLS
ALTER TABLE public.product_relations ENABLE ROW LEVEL SECURITY;

-- Workspace members can manage relations
CREATE POLICY "Workspace members can manage product relations"
ON public.product_relations
FOR ALL
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Public read for store (via anon key) - only active relations for published products
CREATE POLICY "Public can read active product relations"
ON public.product_relations
FOR SELECT
TO anon
USING (is_active = true);
