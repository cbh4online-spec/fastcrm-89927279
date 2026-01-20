-- =============================================
-- GROWTH/SEO MODULE - DATABASE SCHEMA
-- =============================================

-- Tabela principal de entidades SEO
CREATE TABLE public.seo_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('keyword', 'template', 'category', 'tool', 'glossary', 'guide', 'blog', 'profile')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  h1 TEXT,
  tldr TEXT,
  content JSONB DEFAULT '{}',
  intent TEXT CHECK (intent IN ('informational', 'commercial', 'transactional')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  schema_markup JSONB,
  canonical_url TEXT,
  og_image TEXT,
  language TEXT DEFAULT 'pt',
  country TEXT,
  priority NUMERIC(2,1) DEFAULT 0.5,
  change_frequency TEXT DEFAULT 'weekly',
  ai_generated_at TIMESTAMPTZ,
  ai_quality_score NUMERIC(3,2),
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, slug, language)
);

-- Páginas de comparação (A vs B)
CREATE TABLE public.seo_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_a_id UUID REFERENCES public.seo_entities(id) ON DELETE CASCADE,
  entity_b_id UUID REFERENCES public.seo_entities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  content JSONB DEFAULT '{}',
  winner TEXT CHECK (winner IN ('a', 'b', 'tie', NULL)),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  schema_markup JSONB,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slug)
);

-- Consentimentos GDPR
CREATE TABLE public.gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_necessary BOOLEAN DEFAULT true,
  consent_analytics BOOLEAN DEFAULT false,
  consent_marketing BOOLEAN DEFAULT false,
  ip_hash TEXT,
  user_agent TEXT,
  consent_given_at TIMESTAMPTZ DEFAULT now(),
  consent_updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(visitor_id)
);

-- Analytics de páginas SEO (server-side tracking)
CREATE TABLE public.seo_page_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.seo_entities(id) ON DELETE CASCADE,
  comparison_id UUID REFERENCES public.seo_comparisons(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  visitor_id TEXT,
  session_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  country_code TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configurações do módulo Growth por workspace
CREATE TABLE public.growth_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  gtm_container_id TEXT,
  ga4_measurement_id TEXT,
  meta_pixel_id TEXT,
  clarity_project_id TEXT,
  gdpr_enabled BOOLEAN DEFAULT true,
  gdpr_banner_text TEXT,
  gdpr_policy_url TEXT,
  sitemap_auto_update BOOLEAN DEFAULT true,
  default_og_image TEXT,
  social_share_hashtags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FAQs reutilizáveis
CREATE TABLE public.seo_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.seo_entities(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_seo_entities_type_status ON public.seo_entities(entity_type, status);
CREATE INDEX idx_seo_entities_slug ON public.seo_entities(slug);
CREATE INDEX idx_seo_entities_workspace ON public.seo_entities(workspace_id);
CREATE INDEX idx_seo_entities_published ON public.seo_entities(published_at) WHERE status = 'published';
CREATE INDEX idx_seo_comparisons_slug ON public.seo_comparisons(slug);
CREATE INDEX idx_seo_page_analytics_entity ON public.seo_page_analytics(entity_id, created_at);
CREATE INDEX idx_seo_page_analytics_event ON public.seo_page_analytics(event_type, created_at);
CREATE INDEX idx_gdpr_consents_visitor ON public.gdpr_consents(visitor_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_seo_entities_updated_at
  BEFORE UPDATE ON public.seo_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_comparisons_updated_at
  BEFORE UPDATE ON public.seo_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_growth_settings_updated_at
  BEFORE UPDATE ON public.growth_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- SEO Entities: Público para leitura quando published, restrito para escrita
ALTER TABLE public.seo_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published SEO entities are publicly readable"
  ON public.seo_entities FOR SELECT
  USING (status = 'published');

CREATE POLICY "Workspace members can manage SEO entities"
  ON public.seo_entities FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- SEO Comparisons: Mesmo padrão
ALTER TABLE public.seo_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published comparisons are publicly readable"
  ON public.seo_comparisons FOR SELECT
  USING (status = 'published');

CREATE POLICY "Workspace members can manage comparisons"
  ON public.seo_comparisons FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- GDPR Consents: Visitante pode gerir o seu próprio
ALTER TABLE public.gdpr_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert consent"
  ON public.gdpr_consents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Visitors can read own consent"
  ON public.gdpr_consents FOR SELECT
  USING (true);

CREATE POLICY "Visitors can update own consent"
  ON public.gdpr_consents FOR UPDATE
  USING (true);

-- SEO Analytics: Insert público, leitura por workspace
ALTER TABLE public.seo_page_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics"
  ON public.seo_page_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Workspace members can read analytics"
  ON public.seo_page_analytics FOR SELECT
  USING (
    entity_id IN (
      SELECT id FROM public.seo_entities 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Growth Settings: Workspace members only
ALTER TABLE public.growth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage growth settings"
  ON public.growth_settings FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- SEO FAQs: Público para leitura, workspace para escrita
ALTER TABLE public.seo_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs are publicly readable"
  ON public.seo_faqs FOR SELECT
  USING (true);

CREATE POLICY "Workspace members can manage FAQs"
  ON public.seo_faqs FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );