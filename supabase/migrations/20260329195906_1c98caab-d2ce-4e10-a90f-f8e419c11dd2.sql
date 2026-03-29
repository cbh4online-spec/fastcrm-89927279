
-- ebook_templates table
CREATE TABLE public.ebook_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'minimal',
  style_family text NOT NULL DEFAULT 'minimal',
  use_cases jsonb DEFAULT '[]'::jsonb,
  thumbnail_url text,
  preview_images jsonb DEFAULT '[]'::jsonb,
  style_tokens jsonb DEFAULT '{}'::jsonb,
  page_layouts jsonb DEFAULT '[]'::jsonb,
  content_slots jsonb DEFAULT '{}'::jsonb,
  default_content jsonb DEFAULT '{}'::jsonb,
  is_system_template boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ebook_pages table
CREATE TABLE public.ebook_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  page_order integer NOT NULL DEFAULT 0,
  page_type text NOT NULL DEFAULT 'content',
  layout_key text NOT NULL DEFAULT 'rich_text',
  content jsonb DEFAULT '{}'::jsonb,
  style_overrides jsonb DEFAULT '{}'::jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ebook_assets table
CREATE TABLE public.ebook_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ebook_id uuid REFERENCES public.ebooks(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asset_type text NOT NULL DEFAULT 'image',
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add template_id and global_styles to ebooks
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.ebook_templates(id) ON DELETE SET NULL;
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS global_styles jsonb DEFAULT '{}'::jsonb;

-- Indexes
CREATE INDEX idx_ebook_templates_workspace ON public.ebook_templates(workspace_id);
CREATE INDEX idx_ebook_templates_category ON public.ebook_templates(category);
CREATE INDEX idx_ebook_templates_system ON public.ebook_templates(is_system_template);
CREATE INDEX idx_ebook_pages_ebook ON public.ebook_pages(ebook_id);
CREATE INDEX idx_ebook_pages_order ON public.ebook_pages(ebook_id, page_order);
CREATE INDEX idx_ebook_assets_ebook ON public.ebook_assets(ebook_id);
CREATE INDEX idx_ebook_assets_workspace ON public.ebook_assets(workspace_id);

-- RLS for ebook_templates
ALTER TABLE public.ebook_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System templates visible to all authenticated"
  ON public.ebook_templates FOR SELECT TO authenticated
  USING (is_system_template = true);

CREATE POLICY "Workspace templates visible to workspace members"
  ON public.ebook_templates FOR SELECT TO authenticated
  USING (
    is_system_template = false
    AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert templates"
  ON public.ebook_templates FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update own templates"
  ON public.ebook_templates FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete own templates"
  ON public.ebook_templates FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS for ebook_pages
ALTER TABLE public.ebook_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ebook pages accessible via ebook workspace"
  ON public.ebook_pages FOR ALL TO authenticated
  USING (
    ebook_id IN (
      SELECT e.id FROM public.ebooks e
      WHERE e.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    ebook_id IN (
      SELECT e.id FROM public.ebooks e
      WHERE e.workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- RLS for ebook_assets
ALTER TABLE public.ebook_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ebook assets accessible via workspace"
  ON public.ebook_assets FOR ALL TO authenticated
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

-- Seed 9 system templates
INSERT INTO public.ebook_templates (name, slug, description, category, style_family, use_cases, is_system_template, is_active, style_tokens, page_layouts, content_slots, default_content) VALUES
(
  'Minimal Clean 01', 'minimal-clean-01', 'Template minimalista com tons neutros e tipografia elegante. Ideal para eBooks premium, coaching e branding pessoal.',
  'minimal', 'minimal', '["ebook","lead_magnet","guide","coaching"]'::jsonb, true, true,
  '{"primaryColor":"#D9D4CE","secondaryColor":"#5A6470","accentColor":"#C8A97E","backgroundColor":"#FAF9F7","headingFont":"Playfair Display","bodyFont":"Inter","titleWeight":700,"bodyWeight":400,"borderRadius":8,"shadow":"soft"}'::jsonb,
  '["cover_hero_image","copyright_simple","table_of_contents_split","welcome_letter","chapter_intro_large","text_image_split","quote_fullpage","stats_highlight","three_column_highlights","cta_page","author_section","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"authorBio":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"O Seu Guia Premium","subTitle":"Um caminho para o sucesso","authorName":"Autor","authorBio":"Especialista na área","ctaText":"Comece agora","welcomeText":"Bem-vindo a este guia exclusivo.","copyrightText":"© 2025 Todos os direitos reservados."}'::jsonb
),
(
  'Minimal Clean 02', 'minimal-clean-02', 'Variante minimalista com Cormorant e Lato. Visual sofisticado e limpo.',
  'minimal', 'minimal', '["ebook","lead_magnet","premium_guide"]'::jsonb, true, true,
  '{"primaryColor":"#FFFFFF","secondaryColor":"#333333","accentColor":"#B8A88A","backgroundColor":"#FAFAFA","headingFont":"Cormorant Garamond","bodyFont":"Lato","titleWeight":600,"bodyWeight":400,"borderRadius":4,"shadow":"none"}'::jsonb,
  '["cover_split","copyright_simple","disclaimer_clean","table_of_contents_split","chapter_intro_minimal","rich_text","text_image_split","quote_fullpage","testimonial_block","cta_page","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"Guia Essencial","subTitle":"Transforme o seu conhecimento","authorName":"Autor","ctaText":"Saiba mais","copyrightText":"© 2025 Todos os direitos reservados."}'::jsonb
),
(
  'Minimal Soft Editorial', 'minimal-soft-editorial', 'Editorial suave com tons bege. Perfeito para lifestyle e formação.',
  'minimal', 'minimal', '["ebook","workbook","brand_book"]'::jsonb, true, true,
  '{"primaryColor":"#F5F0EB","secondaryColor":"#6B6B6B","accentColor":"#D4A574","backgroundColor":"#FFFDF9","headingFont":"Libre Baskerville","bodyFont":"Source Sans 3","titleWeight":700,"bodyWeight":400,"borderRadius":12,"shadow":"soft"}'::jsonb,
  '["cover_hero_image","copyright_simple","table_of_contents_split","welcome_letter","chapter_intro_large","rich_text","text_image_split","three_column_highlights","quote_fullpage","timeline_block","cta_page","author_section","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"authorBio":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"Soft Editorial","subTitle":"Inspire-se e transforme","authorName":"Autor","authorBio":"Criador de conteúdo","ctaText":"Descubra mais","welcomeText":"Obrigado por estar aqui.","copyrightText":"© 2025"}'::jsonb
),
(
  'Editorial Red Black', 'editorial-red-black', 'Bold editorial com preto, branco e vermelho. Impacto visual máximo.',
  'editorial', 'editorial', '["ebook","storytelling","magazine","authority"]'::jsonb, true, true,
  '{"primaryColor":"#000000","secondaryColor":"#FFFFFF","accentColor":"#E63946","backgroundColor":"#FFFFFF","headingFont":"Oswald","bodyFont":"Roboto","titleWeight":700,"bodyWeight":400,"borderRadius":0,"shadow":"hard"}'::jsonb,
  '["cover_hero_image","copyright_simple","table_of_contents_split","chapter_intro_large","rich_text","text_image_split","quote_fullpage","stats_highlight","three_column_highlights","testimonial_block","cta_page","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"heroImage":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"IMPACTO EDITORIAL","subTitle":"Histórias que transformam","authorName":"Autor","ctaText":"Aja agora","copyrightText":"© 2025"}'::jsonb
),
(
  'Modern Magazine', 'modern-magazine', 'Layout magazine moderno com laranja vibrante. Ideal para marketing e autoridade.',
  'editorial', 'editorial', '["ebook","magazine","marketing","report"]'::jsonb, true, true,
  '{"primaryColor":"#1A1A1A","secondaryColor":"#F8F8F8","accentColor":"#FF6B35","backgroundColor":"#FFFFFF","headingFont":"Montserrat","bodyFont":"Open Sans","titleWeight":800,"bodyWeight":400,"borderRadius":6,"shadow":"medium"}'::jsonb,
  '["cover_split","copyright_simple","table_of_contents_split","chapter_intro_large","rich_text","text_image_split","stats_highlight","three_column_highlights","quote_fullpage","timeline_block","cta_page","author_section","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"authorBio":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"Magazine Moderno","subTitle":"Tendências e Insights","authorName":"Equipa Editorial","authorBio":"Especialistas em conteúdo","ctaText":"Subscreva","copyrightText":"© 2025"}'::jsonb
),
(
  'Impact Story Layout', 'impact-story-layout', 'Layout de storytelling com vermelho vivo. Para narrativas poderosas.',
  'editorial', 'editorial', '["ebook","storytelling","lead_magnet"]'::jsonb, true, true,
  '{"primaryColor":"#0D0D0D","secondaryColor":"#FAFAFA","accentColor":"#FF1744","backgroundColor":"#FAFAFA","headingFont":"Anton","bodyFont":"Nunito","titleWeight":400,"bodyWeight":400,"borderRadius":2,"shadow":"hard"}'::jsonb,
  '["cover_hero_image","disclaimer_clean","table_of_contents_split","chapter_intro_large","rich_text","text_image_split","quote_fullpage","stats_highlight","testimonial_block","cta_page","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"heroImage":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"IMPACT STORY","subTitle":"A narrativa que muda tudo","authorName":"Autor","ctaText":"Comece a ler","copyrightText":"© 2025"}'::jsonb
),
(
  'Brand Strategy Black Gold', 'brand-strategy-black-gold', 'Corporate premium com dourado sobre preto. Para estratégia e consultoria.',
  'corporate', 'corporate', '["ebook","brand_book","proposal","strategy"]'::jsonb, true, true,
  '{"primaryColor":"#1A1A1A","secondaryColor":"#FFFFFF","accentColor":"#D4A03C","backgroundColor":"#FFFFFF","headingFont":"Raleway","bodyFont":"Merriweather","titleWeight":700,"bodyWeight":400,"borderRadius":4,"shadow":"medium"}'::jsonb,
  '["cover_hero_image","copyright_simple","disclaimer_clean","table_of_contents_split","welcome_letter","chapter_intro_large","rich_text","text_image_split","stats_highlight","three_column_highlights","quote_fullpage","timeline_block","cta_page","author_section","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"authorBio":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"Brand Strategy","subTitle":"Posicionamento e Crescimento","authorName":"Consultor","authorBio":"Estratega de marca","ctaText":"Agende uma sessão","welcomeText":"Bem-vindo ao seu guia estratégico.","copyrightText":"© 2025"}'::jsonb
),
(
  'Premium Report White Gold', 'premium-report-white-gold', 'Relatório premium com dourado sobre branco. Para relatórios e apresentações.',
  'corporate', 'corporate', '["report","ebook","premium_guide","proposal"]'::jsonb, true, true,
  '{"primaryColor":"#FFFFFF","secondaryColor":"#2C3E50","accentColor":"#C9A84C","backgroundColor":"#FFFFFF","headingFont":"Poppins","bodyFont":"Lora","titleWeight":600,"bodyWeight":400,"borderRadius":8,"shadow":"soft"}'::jsonb,
  '["cover_split","copyright_simple","table_of_contents_split","chapter_intro_minimal","rich_text","text_image_split","stats_highlight","three_column_highlights","quote_fullpage","testimonial_block","timeline_block","cta_page","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"Relatório Premium","subTitle":"Análise e Resultados","authorName":"Equipa de Análise","ctaText":"Contacte-nos","copyrightText":"© 2025"}'::jsonb
),
(
  'Corporate Playbook Clean Dark', 'corporate-playbook-clean-dark', 'Playbook corporativo dark com laranja. Para manuais e guias operacionais.',
  'corporate', 'corporate', '["ebook","workbook","brand_book","report"]'::jsonb, true, true,
  '{"primaryColor":"#0F1419","secondaryColor":"#E8E8E8","accentColor":"#F5A623","backgroundColor":"#0F1419","headingFont":"Space Grotesk","bodyFont":"IBM Plex Sans","titleWeight":700,"bodyWeight":400,"borderRadius":6,"shadow":"glow"}'::jsonb,
  '["cover_hero_image","copyright_simple","disclaimer_clean","table_of_contents_split","chapter_intro_large","rich_text","text_image_split","stats_highlight","three_column_highlights","quote_fullpage","timeline_block","cta_page","author_section","thank_you_page"]'::jsonb,
  '{"bookTitle":true,"subTitle":true,"authorName":true,"authorBio":true,"heroImage":true,"logo":true,"ctaText":true}'::jsonb,
  '{"bookTitle":"Corporate Playbook","subTitle":"O Manual Completo","authorName":"Equipa","authorBio":"Liderança e operações","ctaText":"Implemente agora","welcomeText":"O seu guia operacional.","copyrightText":"© 2025"}'::jsonb
);
