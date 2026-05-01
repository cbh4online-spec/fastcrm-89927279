-- ============================================
-- CATÁLOGO EDITORIAL B2B (LOOKBOOK)
-- ============================================

-- Tabela: partner_catalog_pages
CREATE TABLE public.partner_catalog_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug TEXT,
  title TEXT NOT NULL,
  eyebrow TEXT,
  description TEXT,
  template_key TEXT NOT NULL DEFAULT 'category-spread',
  theme_key TEXT NOT NULL DEFAULT 'nude-cosmetic',
  hero_image_url TEXT,
  background_color TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_partner_catalog_pages_workspace
  ON public.partner_catalog_pages(workspace_id, display_order)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_partner_catalog_pages_active
  ON public.partner_catalog_pages(workspace_id, is_active, display_order)
  WHERE deleted_at IS NULL AND is_active = true;

-- Tabela: partner_catalog_page_items
CREATE TABLE public.partner_catalog_page_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.partner_catalog_pages(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  slot TEXT NOT NULL DEFAULT 'main',
  custom_title TEXT,
  custom_caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_catalog_page_items_page
  ON public.partner_catalog_page_items(page_id, display_order);

CREATE INDEX idx_partner_catalog_page_items_product
  ON public.partner_catalog_page_items(product_id);

-- Trigger updated_at (assume função já existente)
CREATE TRIGGER trg_partner_catalog_pages_updated_at
  BEFORE UPDATE ON public.partner_catalog_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_partner_catalog_page_items_updated_at
  BEFORE UPDATE ON public.partner_catalog_page_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.partner_catalog_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_catalog_page_items ENABLE ROW LEVEL SECURITY;

-- partner_catalog_pages: SELECT membros do workspace
CREATE POLICY "members_select_pages"
  ON public.partner_catalog_pages
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = partner_catalog_pages.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- partner_catalog_pages: ALL para admins do workspace
CREATE POLICY "admins_all_pages"
  ON public.partner_catalog_pages
  FOR ALL
  TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

-- partner_catalog_page_items: SELECT membros (via page → workspace)
CREATE POLICY "members_select_page_items"
  ON public.partner_catalog_page_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_catalog_pages p
      JOIN public.workspace_members wm
        ON wm.workspace_id = p.workspace_id
       AND wm.user_id = auth.uid()
      WHERE p.id = partner_catalog_page_items.page_id
        AND p.deleted_at IS NULL
    )
  );

-- partner_catalog_page_items: ALL para admins do workspace
CREATE POLICY "admins_all_page_items"
  ON public.partner_catalog_page_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_catalog_pages p
      WHERE p.id = partner_catalog_page_items.page_id
        AND public.is_workspace_admin(auth.uid(), p.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_catalog_pages p
      WHERE p.id = partner_catalog_page_items.page_id
        AND public.is_workspace_admin(auth.uid(), p.workspace_id)
    )
  );