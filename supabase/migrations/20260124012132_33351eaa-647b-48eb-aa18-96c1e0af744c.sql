-- ============================================
-- STUDENT JOURNEY: FASE 1 - MODELO DE DADOS ATUALIZADO
-- ============================================

-- 1) Criar tabela sj_specialties (áreas de formação)
CREATE TABLE IF NOT EXISTS public.sj_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  clinical_risk_level TEXT DEFAULT 'medium' CHECK (clinical_risk_level IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para sj_specialties
CREATE INDEX IF NOT EXISTS idx_sj_specialties_workspace ON public.sj_specialties(workspace_id);

-- RLS para sj_specialties
ALTER TABLE public.sj_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sj_specialties_workspace_access" ON public.sj_specialties
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- 2) Adicionar coluna specialty_id ao sj_courses
ALTER TABLE public.sj_courses 
  ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.sj_specialties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sj_courses_specialty ON public.sj_courses(specialty_id);

-- 3) Adicionar novos campos ao sj_profiles para o Growth Engine
ALTER TABLE public.sj_profiles
  ADD COLUMN IF NOT EXISTS primary_specialty TEXT,
  ADD COLUMN IF NOT EXISTS specialties_progress JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_courses_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_course_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activation_potential TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_best_action TEXT;

-- Índices para novos campos de sj_profiles
CREATE INDEX IF NOT EXISTS idx_sj_profiles_activation ON public.sj_profiles(activation_potential);
CREATE INDEX IF NOT EXISTS idx_sj_profiles_total_completed ON public.sj_profiles(total_courses_completed);
CREATE INDEX IF NOT EXISTS idx_sj_profiles_last_completed ON public.sj_profiles(last_course_completed_at);

-- 4) Criar função para atualizar total_courses_completed automaticamente
CREATE OR REPLACE FUNCTION public.update_sj_profile_course_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma enrollment é marcada como completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.sj_profiles
    SET 
      total_courses_completed = COALESCE(total_courses_completed, 0) + 1,
      last_course_completed_at = COALESCE(NEW.completed_at, now()),
      lifecycle_stage = CASE 
        WHEN lifecycle_stage IN ('active', 'enrolled') THEN 'completed'
        ELSE lifecycle_stage
      END,
      updated_at = now()
    WHERE id = NEW.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para atualizar stats quando enrollment é completada
DROP TRIGGER IF EXISTS trigger_update_profile_course_stats ON public.sj_enrollments;
CREATE TRIGGER trigger_update_profile_course_stats
  AFTER INSERT OR UPDATE ON public.sj_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sj_profile_course_stats();

-- 5) Criar função para calcular activation_potential automaticamente
CREATE OR REPLACE FUNCTION public.calculate_sj_activation_potential()
RETURNS TRIGGER AS $$
DECLARE
  days_since_completion INTEGER;
  course_count INTEGER;
  new_potential TEXT;
BEGIN
  -- Calcular dias desde última conclusão
  IF NEW.last_course_completed_at IS NOT NULL THEN
    days_since_completion := EXTRACT(DAY FROM (now() - NEW.last_course_completed_at));
  ELSE
    days_since_completion := 999;
  END IF;
  
  course_count := COALESCE(NEW.total_courses_completed, 0);
  
  -- Lógica de potencial de ativação
  IF course_count >= 2 AND days_since_completion BETWEEN 14 AND 60 THEN
    new_potential := 'high';
  ELSIF course_count >= 1 AND days_since_completion BETWEEN 14 AND 90 THEN
    new_potential := 'medium';
  ELSE
    new_potential := 'low';
  END IF;
  
  NEW.activation_potential := new_potential;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para calcular activation_potential
DROP TRIGGER IF EXISTS trigger_calculate_activation_potential ON public.sj_profiles;
CREATE TRIGGER trigger_calculate_activation_potential
  BEFORE INSERT OR UPDATE OF total_courses_completed, last_course_completed_at ON public.sj_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_sj_activation_potential();

-- 6) Trigger para updated_at em sj_specialties
DROP TRIGGER IF EXISTS update_sj_specialties_updated_at ON public.sj_specialties;
CREATE TRIGGER update_sj_specialties_updated_at
  BEFORE UPDATE ON public.sj_specialties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();