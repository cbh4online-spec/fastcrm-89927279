
-- Create product_catalogs table
CREATE TABLE public.product_catalogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  style_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{"products_per_page": 2, "show_prices": true, "show_descriptions": true, "watermark": false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Create product_catalog_items table
CREATE TABLE public.product_catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  custom_title TEXT,
  custom_description TEXT,
  custom_image TEXT,
  page_break_before BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(catalog_id, product_id)
);

-- Indexes
CREATE INDEX idx_product_catalogs_workspace ON public.product_catalogs(workspace_id);
CREATE INDEX idx_product_catalogs_slug ON public.product_catalogs(workspace_id, slug);
CREATE INDEX idx_product_catalog_items_catalog ON public.product_catalog_items(catalog_id);
CREATE INDEX idx_product_catalog_items_sort ON public.product_catalog_items(catalog_id, sort_order);

-- Enable RLS
ALTER TABLE public.product_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog_items ENABLE ROW LEVEL SECURITY;

-- RLS for product_catalogs: workspace members
CREATE POLICY "Workspace members can manage catalogs"
  ON public.product_catalogs
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- Public read for published catalogs (store visitors)
CREATE POLICY "Public can view published catalogs"
  ON public.product_catalogs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND is_public = true);

-- RLS for product_catalog_items: via catalog's workspace
CREATE POLICY "Workspace members can manage catalog items"
  ON public.product_catalog_items
  FOR ALL
  TO authenticated
  USING (
    catalog_id IN (
      SELECT pc.id FROM public.product_catalogs pc
      JOIN public.workspace_members wm ON wm.workspace_id = pc.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    catalog_id IN (
      SELECT pc.id FROM public.product_catalogs pc
      JOIN public.workspace_members wm ON wm.workspace_id = pc.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Public read for items of published catalogs
CREATE POLICY "Public can view items of published catalogs"
  ON public.product_catalog_items
  FOR SELECT
  TO anon, authenticated
  USING (
    catalog_id IN (
      SELECT pc.id FROM public.product_catalogs pc
      WHERE pc.status = 'published' AND pc.is_public = true
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_product_catalogs_updated_at
  BEFORE UPDATE ON public.product_catalogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
