
-- ============================================================
-- LeadChef Admin Center: landing content + app config tables
-- ============================================================

-- 1) Landing content (singleton per workspace; canonical workspace serves /leadchef)
CREATE TABLE IF NOT EXISTS public.leadchef_landing_content (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_canonical boolean NOT NULL DEFAULT false,
  hero jsonb NOT NULL DEFAULT '{}'::jsonb,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  journey jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ctas jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  images jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Apenas um workspace canónico
CREATE UNIQUE INDEX IF NOT EXISTS leadchef_landing_canonical_unique
  ON public.leadchef_landing_content (is_canonical)
  WHERE is_canonical = true;

ALTER TABLE public.leadchef_landing_content ENABLE ROW LEVEL SECURITY;

-- Leitura pública (landing pública)
CREATE POLICY "Landing content is publicly readable"
  ON public.leadchef_landing_content
  FOR SELECT
  USING (true);

-- Escrita: admins do workspace ou super_admin
CREATE POLICY "Admins manage their workspace landing"
  ON public.leadchef_landing_content
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_landing_content.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_landing_content.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
  );

CREATE TRIGGER trg_leadchef_landing_updated_at
  BEFORE UPDATE ON public.leadchef_landing_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) App config (branding + módulos visíveis no shell mobile)
CREATE TABLE IF NOT EXISTS public.leadchef_app_config (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text,
  accent_color text,
  enabled_modules text[] NOT NULL DEFAULT ARRAY[
    'today','leads','agenda','clientes','referencias','objetivos',
    'equipa','templates','automacoes','sequencias','relatorios',
    'inteligencia','notificacoes','ferramentas'
  ],
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarding jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leadchef_app_config ENABLE ROW LEVEL SECURITY;

-- Membros do workspace podem ler
CREATE POLICY "Workspace members read app config"
  ON public.leadchef_app_config
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_app_config.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- Apenas admins escrevem
CREATE POLICY "Admins write app config"
  ON public.leadchef_app_config
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_app_config.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_app_config.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
  );

CREATE TRIGGER trg_leadchef_app_config_updated_at
  BEFORE UPDATE ON public.leadchef_app_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
