-- =============================================
-- ACTIVITY PROFILE SYSTEM - PHASE 1: DATABASE
-- =============================================

-- 1. Create activity profile types enum
CREATE TYPE public.activity_profile_type AS ENUM (
  'formacao_educacao',
  'produtos',
  'servicos_financeiros',
  'marketing_digital',
  'avencas_contratos',
  'servicos_profissionais',
  'generico',
  'custom'
);

-- 2. Activity Profile Definitions Table (templates)
CREATE TABLE public.activity_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  profile_type activity_profile_type NOT NULL DEFAULT 'generico',
  icon TEXT DEFAULT 'Briefcase',
  color TEXT DEFAULT '#6366f1',
  is_system BOOLEAN DEFAULT false, -- System profiles can't be deleted
  is_active BOOLEAN DEFAULT true,
  -- Field visibility configuration
  visible_fields JSONB DEFAULT '{}', -- { "contacts": ["field1", "field2"], "companies": [...] }
  hidden_fields JSONB DEFAULT '{}',
  -- Module configuration
  active_modules JSONB DEFAULT '["contacts", "companies", "opportunities", "products", "meetings", "tasks", "history", "payments"]',
  module_settings JSONB DEFAULT '{}', -- Per-module settings
  -- Custom fields specific to this profile
  custom_fields_config JSONB DEFAULT '[]',
  -- Automation triggers
  automation_triggers JSONB DEFAULT '[]',
  -- KPI configuration
  kpi_config JSONB DEFAULT '[]',
  -- AI context and behavior
  ai_context JSONB DEFAULT '{}', -- { "terminology": { "client": "aluno" }, "focus_areas": [...] }
  ai_suggestions_enabled BOOLEAN DEFAULT true,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(workspace_id, code)
);

-- 3. Workspace default profile setting
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS default_activity_profile_id UUID REFERENCES public.activity_profiles(id) ON DELETE SET NULL;

-- 4. Add activity profile to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS activity_profile_id UUID REFERENCES public.activity_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activity_profile_override JSONB DEFAULT NULL; -- For custom field values specific to profile

-- 5. Add activity profile to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS activity_profile_id UUID REFERENCES public.activity_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activity_profile_override JSONB DEFAULT NULL;

-- 6. Profile-specific custom fields values (for dynamic fields per profile)
CREATE TABLE public.entity_profile_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'opportunity')),
  entity_id UUID NOT NULL,
  activity_profile_id UUID NOT NULL REFERENCES public.activity_profiles(id) ON DELETE CASCADE,
  field_values JSONB DEFAULT '{}', -- Profile-specific field values
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, activity_profile_id)
);

-- 7. Profile analytics/usage tracking
CREATE TABLE public.activity_profile_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  activity_profile_id UUID NOT NULL REFERENCES public.activity_profiles(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'entities_count', 'field_usage', 'module_usage', 'automation_triggered'
  metric_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable RLS
ALTER TABLE public.activity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_profile_analytics ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for activity_profiles
CREATE POLICY "Users can view profiles in their workspace"
ON public.activity_profiles FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners and admins can manage profiles"
ON public.activity_profiles FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- 10. RLS Policies for entity_profile_data
CREATE POLICY "Users can view entity profile data in their workspace"
ON public.entity_profile_data FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage entity profile data in their workspace"
ON public.entity_profile_data FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- 11. RLS Policies for analytics
CREATE POLICY "Users can view analytics in their workspace"
ON public.activity_profile_analytics FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert analytics"
ON public.activity_profile_analytics FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- 12. Indexes for performance
CREATE INDEX idx_activity_profiles_workspace ON public.activity_profiles(workspace_id);
CREATE INDEX idx_activity_profiles_type ON public.activity_profiles(profile_type);
CREATE INDEX idx_entity_profile_data_entity ON public.entity_profile_data(entity_type, entity_id);
CREATE INDEX idx_entity_profile_data_profile ON public.entity_profile_data(activity_profile_id);
CREATE INDEX idx_companies_activity_profile ON public.companies(activity_profile_id);
CREATE INDEX idx_contacts_activity_profile ON public.contacts(activity_profile_id);

-- 13. Updated_at trigger
CREATE TRIGGER update_activity_profiles_updated_at
BEFORE UPDATE ON public.activity_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entity_profile_data_updated_at
BEFORE UPDATE ON public.entity_profile_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Function to initialize default profiles for a workspace
CREATE OR REPLACE FUNCTION public.initialize_workspace_activity_profiles(p_workspace_id UUID, p_created_by UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Insert default system profiles
  INSERT INTO public.activity_profiles (workspace_id, code, name, description, profile_type, icon, color, is_system, visible_fields, ai_context, created_by)
  VALUES
    -- Genérico (default)
    (p_workspace_id, 'generico', 'Genérico', 'Perfil padrão para negócios gerais', 'generico', 'Briefcase', '#6366f1', true,
     '{"contacts": ["name", "email", "phone", "company", "job_title", "tags", "notes"], "companies": ["name", "email", "phone", "industry", "website", "address"]}',
     '{"terminology": {"client": "cliente", "deal": "oportunidade"}, "focus_areas": ["vendas", "relacionamento"]}',
     p_created_by),
    
    -- Formação / Educação
    (p_workspace_id, 'formacao_educacao', 'Formação / Educação', 'Para escolas, formadores e instituições educativas', 'formacao_educacao', 'GraduationCap', '#10b981', true,
     '{"contacts": ["name", "email", "phone", "tipo_aluno", "cursos_inscritos", "nivel", "sessoes_realizadas", "sessoes_pendentes", "certificado"], "companies": ["name", "tipo_instituicao"]}',
     '{"terminology": {"client": "aluno", "deal": "matrícula", "product": "curso"}, "focus_areas": ["progresso", "sessões", "certificação", "abandono"]}',
     p_created_by),
    
    -- Produtos
    (p_workspace_id, 'produtos', 'Produtos', 'Para comércio e venda de produtos físicos ou digitais', 'produtos', 'Package', '#f59e0b', true,
     '{"contacts": ["name", "email", "phone", "produtos_comprados", "frequencia_compra", "ultima_compra", "margem_media", "valor_total_compras"], "companies": ["name", "categoria_cliente", "volume_compras"]}',
     '{"terminology": {"client": "cliente", "deal": "encomenda", "product": "produto"}, "focus_areas": ["recompra", "cross-sell", "bundles", "stock"]}',
     p_created_by),
    
    -- Serviços Financeiros
    (p_workspace_id, 'servicos_financeiros', 'Serviços Financeiros', 'Para contabilistas, consultores fiscais e financeiros', 'servicos_financeiros', 'Calculator', '#3b82f6', true,
     '{"contacts": ["name", "email", "phone", "nif", "tipo_servico", "datas_fiscais", "documentos_associados", "renovacao_anual"], "companies": ["name", "nif", "regime_fiscal", "atividade_cae"]}',
     '{"terminology": {"client": "cliente", "deal": "serviço", "product": "serviço fiscal"}, "focus_areas": ["prazos legais", "obrigações fiscais", "renovações", "compliance"]}',
     p_created_by),
    
    -- Marketing Digital
    (p_workspace_id, 'marketing_digital', 'Marketing Digital', 'Para agências e profissionais de marketing', 'marketing_digital', 'TrendingUp', '#ec4899', true,
     '{"contacts": ["name", "email", "phone", "servicos_contratados", "campanhas_ativas", "kpis_marketing", "relatorios_mensais"], "companies": ["name", "website", "redes_sociais", "budget_marketing"]}',
     '{"terminology": {"client": "cliente", "deal": "campanha", "product": "serviço"}, "focus_areas": ["performance", "ROI", "leads gerados", "otimização"]}',
     p_created_by),
    
    -- Avenças / Contratos
    (p_workspace_id, 'avencas_contratos', 'Avenças / Contratos', 'Para serviços recorrentes e contratos de longo prazo', 'avencas_contratos', 'FileText', '#8b5cf6', true,
     '{"contacts": ["name", "email", "phone", "valor_mensal", "inicio_contrato", "fim_contrato", "sla", "renovacao_automatica"], "companies": ["name", "contratos_ativos", "valor_recorrente", "historico_renovacoes"]}',
     '{"terminology": {"client": "cliente", "deal": "contrato", "product": "serviço"}, "focus_areas": ["renovação", "churn", "receita recorrente", "SLA"]}',
     p_created_by),
    
    -- Serviços Profissionais
    (p_workspace_id, 'servicos_profissionais', 'Serviços Profissionais', 'Para consultores, advogados e outros profissionais', 'servicos_profissionais', 'Briefcase', '#64748b', true,
     '{"contacts": ["name", "email", "phone", "tipo_cliente", "projetos_ativos", "horas_faturadas", "valor_hora"], "companies": ["name", "setor", "dimensao", "projetos_concluidos"]}',
     '{"terminology": {"client": "cliente", "deal": "projeto", "product": "serviço"}, "focus_areas": ["projetos", "horas", "faturação", "satisfação"]}',
     p_created_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Trigger to auto-create profiles when workspace is created
CREATE OR REPLACE FUNCTION public.on_workspace_created_init_profiles()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.initialize_workspace_activity_profiles(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We'll add this trigger only to new workspaces to avoid issues with existing ones
-- For existing workspaces, we'll call the function manually or via an edge function