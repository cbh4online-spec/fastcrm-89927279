-- =============================================
-- PROSPECÇÃO PROFISSIONAL - TABELAS V1
-- =============================================

-- Tabela de pesquisas realizadas
CREATE TABLE public.professional_prospecting_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  profession TEXT NOT NULL,
  location TEXT,
  keywords TEXT[],
  search_type TEXT NOT NULL DEFAULT 'web' CHECK (search_type IN ('web', 'manual', 'combined')),
  results_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de perfis/resultados analisados
CREATE TABLE public.professional_prospecting_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.professional_prospecting_searches(id) ON DELETE SET NULL,
  
  -- Dados do perfil original
  profile_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'twitter', 'website', 'other')),
  profile_name TEXT,
  profile_bio TEXT,
  profile_link TEXT,
  profile_image_url TEXT,
  raw_data JSONB,
  
  -- Análise da IA
  ai_analysis JSONB,
  inferred_type TEXT CHECK (inferred_type IN ('individual', 'clinic', 'company', 'unknown')),
  inferred_profession TEXT,
  inferred_specialty TEXT,
  inferred_location TEXT,
  inferred_workplace TEXT,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Lead Score
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
  lead_score_explanation TEXT,
  lead_score_factors JSONB,
  
  -- Status e conversão
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'converted', 'rejected', 'error')),
  converted_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  converted_by UUID,
  rejection_reason TEXT,
  
  -- Controlo
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Evitar duplicados
  UNIQUE(workspace_id, profile_url)
);

-- Tabela de limites de uso por workspace
CREATE TABLE public.professional_prospecting_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  searches_count INTEGER NOT NULL DEFAULT 0,
  searches_limit INTEGER NOT NULL DEFAULT 50,
  profiles_analyzed_count INTEGER NOT NULL DEFAULT 0,
  profiles_analyzed_limit INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, period_start)
);

-- Índices para performance
CREATE INDEX idx_prospecting_searches_workspace ON public.professional_prospecting_searches(workspace_id);
CREATE INDEX idx_prospecting_searches_status ON public.professional_prospecting_searches(status);
CREATE INDEX idx_prospecting_profiles_workspace ON public.professional_prospecting_profiles(workspace_id);
CREATE INDEX idx_prospecting_profiles_search ON public.professional_prospecting_profiles(search_id);
CREATE INDEX idx_prospecting_profiles_status ON public.professional_prospecting_profiles(status);
CREATE INDEX idx_prospecting_profiles_score ON public.professional_prospecting_profiles(lead_score DESC);
CREATE INDEX idx_prospecting_usage_workspace_period ON public.professional_prospecting_usage(workspace_id, period_start);

-- Enable RLS
ALTER TABLE public.professional_prospecting_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_prospecting_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_prospecting_usage ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Pesquisas
CREATE POLICY "Users can view searches in their workspace"
ON public.professional_prospecting_searches FOR SELECT
USING (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Users can create searches in their workspace"
ON public.professional_prospecting_searches FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Users can update searches in their workspace"
ON public.professional_prospecting_searches FOR UPDATE
USING (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

-- Políticas RLS - Perfis
CREATE POLICY "Users can view profiles in their workspace"
ON public.professional_prospecting_profiles FOR SELECT
USING (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Users can create profiles in their workspace"
ON public.professional_prospecting_profiles FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Users can update profiles in their workspace"
ON public.professional_prospecting_profiles FOR UPDATE
USING (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

-- Políticas RLS - Usage
CREATE POLICY "Users can view usage in their workspace"
ON public.professional_prospecting_usage FOR SELECT
USING (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Users can create usage in their workspace"
ON public.professional_prospecting_usage FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Users can update usage in their workspace"
ON public.professional_prospecting_usage FOR UPDATE
USING (workspace_id IN (
  SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
));

-- Trigger para updated_at
CREATE TRIGGER update_prospecting_profiles_updated_at
BEFORE UPDATE ON public.professional_prospecting_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospecting_usage_updated_at
BEFORE UPDATE ON public.professional_prospecting_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para obter ou criar usage do mês atual
CREATE OR REPLACE FUNCTION public.get_or_create_prospecting_usage(p_workspace_id UUID)
RETURNS public.professional_prospecting_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage public.professional_prospecting_usage;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calcular período do mês atual
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;
  
  -- Tentar obter usage existente
  SELECT * INTO v_usage
  FROM public.professional_prospecting_usage
  WHERE workspace_id = p_workspace_id
    AND period_start = v_period_start;
  
  -- Se não existir, criar
  IF NOT FOUND THEN
    INSERT INTO public.professional_prospecting_usage (
      workspace_id, period_start, period_end, 
      searches_limit, profiles_analyzed_limit
    )
    VALUES (
      p_workspace_id, v_period_start, v_period_end,
      50, 200  -- Limites generosos para Beta
    )
    RETURNING * INTO v_usage;
  END IF;
  
  RETURN v_usage;
END;
$$;