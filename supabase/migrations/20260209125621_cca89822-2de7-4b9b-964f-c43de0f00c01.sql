
-- Store settings per workspace for storefront customization
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  store_name TEXT,
  store_description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  accent_color TEXT DEFAULT '#f59e0b',
  footer_text TEXT,
  show_categories BOOLEAN DEFAULT true,
  show_search BOOLEAN DEFAULT true,
  notification_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public read for storefront
CREATE POLICY "Store settings are publicly readable"
  ON public.store_settings FOR SELECT
  USING (true);

-- Workspace members can manage
CREATE POLICY "Workspace members can manage store settings"
  ON public.store_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = store_settings.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
