-- 1) Tabela de apresentações
CREATE TABLE public.module_onboarding_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  slide_order integer NOT NULL DEFAULT 1,
  lang text NOT NULL DEFAULT 'pt',
  heading text NOT NULL,
  body text,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  cta_label text,
  cta_url text,
  min_duration_seconds integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_slug, lang, slide_order)
);

CREATE INDEX idx_mop_module_lang ON public.module_onboarding_presentations (module_slug, lang, slide_order) WHERE is_active = true;

ALTER TABLE public.module_onboarding_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mop_select_authenticated"
ON public.module_onboarding_presentations FOR SELECT
TO authenticated
USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "mop_super_admin_all"
ON public.module_onboarding_presentations FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_mop_updated_at
BEFORE UPDATE ON public.module_onboarding_presentations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Tabela de conclusões
CREATE TABLE public.module_onboarding_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  module_slug text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  slides_viewed integer NOT NULL DEFAULT 0,
  total_slides integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  skipped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, module_slug)
);

CREATE INDEX idx_moc_user_module ON public.module_onboarding_completions (user_id, module_slug);
CREATE INDEX idx_moc_workspace ON public.module_onboarding_completions (workspace_id);

ALTER TABLE public.module_onboarding_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moc_select_own_or_super"
ON public.module_onboarding_completions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "moc_insert_own"
ON public.module_onboarding_completions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = module_onboarding_completions.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "moc_super_admin_manage"
ON public.module_onboarding_completions FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 3) Grandfathering: marcar como concluído para utilizadores com módulos já instalados
INSERT INTO public.module_onboarding_completions (workspace_id, user_id, module_slug, slides_viewed, total_slides, skipped)
SELECT DISTINCT
  wm_user.workspace_id,
  wm_user.user_id,
  mm.slug,
  0,
  0,
  true
FROM public.workspace_modules wmod
JOIN public.marketplace_modules mm ON mm.id = wmod.module_id
JOIN public.workspace_members wm_user ON wm_user.workspace_id = wmod.workspace_id
WHERE wmod.status IN ('active','trial')
ON CONFLICT (workspace_id, user_id, module_slug) DO NOTHING;

-- 4) Seed inicial: slides genéricos para módulos críticos
INSERT INTO public.module_onboarding_presentations (module_slug, slide_order, lang, heading, body, bullets, cta_label, min_duration_seconds)
VALUES
  ('crm-contacts', 1, 'pt', 'Bem-vindo aos Contactos', 'Centraliza toda a informação dos teus contactos num só lugar.', '["Importa contactos via CSV ou integrações","Segmenta com tags e listas dinâmicas","Histórico completo de interações"]'::jsonb, NULL, 4),
  ('crm-contacts', 2, 'pt', 'O que podes fazer', 'Ferramentas para gerir relacionamentos comerciais de forma profissional.', '["Deduplicação automática por NIF/Email","Enriquecimento via LinkedIn","Atribuição automática a gestores"]'::jsonb, NULL, 4),
  ('crm-contacts', 3, 'pt', 'Pronto para começar?', 'Cria o teu primeiro contacto ou importa a tua base existente.', '["Botão Importar disponível no topo","Cria contacto manual com Ctrl+N","Integra com WhatsApp e Email"]'::jsonb, 'Começar a usar Contactos', 3),

  ('sales-products', 1, 'pt', 'Bem-vindo aos Produtos', 'Gere o teu catálogo completo com preços, stock e variantes.', '["Variantes por capacidade, peso ou tamanho","Pricing rules dinâmicas","Histórico de preços auditável"]'::jsonb, NULL, 4),
  ('sales-products', 2, 'pt', 'Catálogo Inteligente', 'Importa, organiza e mantém o teu catálogo sempre atualizado.', '["Import via CSV ou XML de fornecedor","Margens protegidas automaticamente","Stock multi-armazém"]'::jsonb, NULL, 4),
  ('sales-products', 3, 'pt', 'Vamos começar', 'Cria o teu primeiro produto ou importa o catálogo.', '["Botão Novo produto no topo direito","Atributos físicos para frascos/líquidos","Integração com loja online"]'::jsonb, 'Começar a usar Produtos', 3),

  ('crm-opportunities', 1, 'pt', 'Bem-vindo às Oportunidades', 'Acompanha o teu pipeline comercial visualmente.', '["Vista Kanban e tabela","Estágios personalizáveis","Forecast automático por probabilidade"]'::jsonb, NULL, 4),
  ('crm-opportunities', 2, 'pt', 'Pipeline Inteligente', 'IA deteta deals em risco e sugere próximos passos.', '["Alertas de deals parados >5 dias","Score de probabilidade automático","Sugestões de follow-up"]'::jsonb, NULL, 4),
  ('crm-opportunities', 3, 'pt', 'Pronto para vender mais?', 'Cria a tua primeira oportunidade.', '["Arrasta cards entre estágios","Liga a contactos e produtos","Gera proposta com 1 clique"]'::jsonb, 'Começar a usar Oportunidades', 3),

  ('mkt-email', 1, 'pt', 'Bem-vindo ao Email Marketing', 'Cria campanhas profissionais com editor visual.', '["Editor drag-and-drop","Templates prontos a usar","A/B testing nativo"]'::jsonb, NULL, 4),
  ('mkt-email', 2, 'pt', 'Automações Poderosas', 'Sequências de email baseadas em comportamento.', '["Triggers por evento","Personalização com IA","Métricas em tempo real"]'::jsonb, NULL, 4),
  ('mkt-email', 3, 'pt', 'Vamos enviar?', 'Cria a tua primeira campanha.', '["Importa contactos primeiro","Configura domínio para entregabilidade","Agenda envios automáticos"]'::jsonb, 'Começar a usar Email', 3),

  ('inbox', 1, 'pt', 'Bem-vindo ao Inbox', 'Centraliza WhatsApp, Email, SMS e mais num só lugar.', '["Multi-canal unificado","Atribuição automática","Respostas com IA"]'::jsonb, NULL, 4),
  ('inbox', 2, 'pt', 'Conversas Eficientes', 'Templates, automações e colaboração em equipa.', '["Notas internas privadas","Templates rápidos","Histórico do contacto à direita"]'::jsonb, NULL, 4),
  ('inbox', 3, 'pt', 'Pronto para responder?', 'Liga os teus canais e começa a conversar.', '["WhatsApp via QR code","Email via SMTP/Gmail","SMS via Twilio"]'::jsonb, 'Começar a usar Inbox', 3);
