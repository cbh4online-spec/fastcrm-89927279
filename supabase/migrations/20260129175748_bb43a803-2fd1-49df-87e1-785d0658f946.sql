-- =============================================
-- SECTION 11: VIBE / DESIGN CONFIGURATION
-- Defines the default communication style and tone
-- =============================================

-- Vibe profiles table for reusable style configurations
CREATE TABLE public.vibe_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  
  -- Core tone settings
  tone TEXT NOT NULL DEFAULT 'calm', -- calm, energetic, neutral, warm
  formality TEXT NOT NULL DEFAULT 'formal', -- formal, semi-formal, casual
  personality TEXT NOT NULL DEFAULT 'professional', -- professional, friendly, empathetic, educational
  
  -- Language settings
  language_code TEXT NOT NULL DEFAULT 'pt-PT',
  use_emojis BOOLEAN NOT NULL DEFAULT false,
  use_exclamations BOOLEAN NOT NULL DEFAULT false,
  use_contractions BOOLEAN NOT NULL DEFAULT true,
  
  -- Response formatting
  response_length TEXT NOT NULL DEFAULT 'concise', -- concise, balanced, detailed
  max_sentences_per_response INTEGER DEFAULT 3,
  preferred_structure TEXT NOT NULL DEFAULT 'direct', -- direct, narrative, bullet_points
  
  -- Commercial stance
  commercial_approach TEXT NOT NULL DEFAULT 'non_commercial', -- non_commercial, soft_sell, consultative
  avoid_sales_language BOOLEAN NOT NULL DEFAULT true,
  focus_on_value BOOLEAN NOT NULL DEFAULT true,
  
  -- Humanization
  acknowledge_emotions BOOLEAN NOT NULL DEFAULT true,
  use_first_person BOOLEAN NOT NULL DEFAULT true,
  personalize_responses BOOLEAN NOT NULL DEFAULT true,
  
  -- Defaults
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, code)
);

-- Enable RLS
ALTER TABLE public.vibe_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view vibe profiles in their workspace"
  ON public.vibe_profiles FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage vibe profiles in their workspace"
  ON public.vibe_profiles FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Vibe phrases/templates for consistent language
CREATE TABLE public.vibe_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  vibe_profile_id UUID REFERENCES public.vibe_profiles(id) ON DELETE CASCADE,
  
  phrase_type TEXT NOT NULL, -- greeting, acknowledgment, transition, closing, fallback
  context TEXT, -- e.g., 'first_contact', 'returning_user', 'escalation'
  
  original_phrase TEXT NOT NULL, -- e.g., "Hi there!"
  preferred_phrase TEXT NOT NULL, -- e.g., "Bom dia."
  
  is_blocked BOOLEAN DEFAULT false, -- phrases to never use
  is_required BOOLEAN DEFAULT false, -- phrases to always include
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vibe_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vibe phrases in their workspace"
  ON public.vibe_phrases FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage vibe phrases in their workspace"
  ON public.vibe_phrases FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Link vibe profiles to personas
ALTER TABLE public.ai_personas 
ADD COLUMN IF NOT EXISTS vibe_profile_id UUID REFERENCES public.vibe_profiles(id) ON DELETE SET NULL;

-- Function to generate vibe-aware system prompt additions
CREATE OR REPLACE FUNCTION public.get_vibe_instructions(p_vibe_profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_instructions TEXT := '';
BEGIN
  SELECT * INTO v_profile FROM vibe_profiles WHERE id = p_vibe_profile_id;
  
  IF NOT FOUND THEN
    RETURN '';
  END IF;
  
  v_instructions := E'\n\n## ESTILO DE COMUNICAÇÃO\n';
  
  -- Tone
  v_instructions := v_instructions || CASE v_profile.tone
    WHEN 'calm' THEN E'- Mantém um tom calmo e sereno em todas as interações\n'
    WHEN 'warm' THEN E'- Usa um tom acolhedor e próximo\n'
    WHEN 'neutral' THEN E'- Mantém um tom neutro e objetivo\n'
    ELSE ''
  END;
  
  -- Formality
  v_instructions := v_instructions || CASE v_profile.formality
    WHEN 'formal' THEN E'- Usa linguagem formal e tratamento por "você" ou forma impessoal\n'
    WHEN 'semi-formal' THEN E'- Usa linguagem semi-formal, equilibrada\n'
    ELSE E'- Usa linguagem casual e próxima\n'
  END;
  
  -- Personality
  v_instructions := v_instructions || CASE v_profile.personality
    WHEN 'professional' THEN E'- Mantém postura profissional e empresarial\n'
    WHEN 'empathetic' THEN E'- Demonstra empatia e compreensão\n'
    WHEN 'educational' THEN E'- Adopta postura educativa e explicativa\n'
    ELSE ''
  END;
  
  -- Language specifics
  IF v_profile.language_code = 'pt-PT' THEN
    v_instructions := v_instructions || E'- Usa Português de Portugal (PT-PT), evitando brasileirismos\n';
  END IF;
  
  IF NOT v_profile.use_emojis THEN
    v_instructions := v_instructions || E'- NÃO usa emojis em nenhuma circunstância\n';
  END IF;
  
  IF NOT v_profile.use_exclamations THEN
    v_instructions := v_instructions || E'- Evita pontos de exclamação excessivos\n';
  END IF;
  
  -- Response length
  v_instructions := v_instructions || CASE v_profile.response_length
    WHEN 'concise' THEN E'- Respostas curtas e diretas (máximo ' || COALESCE(v_profile.max_sentences_per_response, 3)::TEXT || E' frases)\n'
    WHEN 'balanced' THEN E'- Respostas equilibradas, nem demasiado curtas nem longas\n'
    ELSE E'- Respostas detalhadas quando necessário\n'
  END;
  
  -- Commercial stance
  IF v_profile.commercial_approach = 'non_commercial' THEN
    v_instructions := v_instructions || E'\n## POSTURA NÃO-COMERCIAL\n';
    v_instructions := v_instructions || E'- NÃO tenta vender ou promover directamente\n';
    v_instructions := v_instructions || E'- Foca em ajudar e informar, não em converter\n';
    v_instructions := v_instructions || E'- Evita linguagem de marketing ou vendas\n';
    v_instructions := v_instructions || E'- Deixa o utilizador chegar às suas próprias conclusões\n';
  END IF;
  
  -- Humanization
  IF v_profile.acknowledge_emotions THEN
    v_instructions := v_instructions || E'- Reconhece emoções e preocupações do utilizador\n';
  END IF;
  
  RETURN v_instructions;
END;
$$;

-- Insert default vibe profile template (will be cloned per workspace)
COMMENT ON TABLE public.vibe_profiles IS 'Stores communication style configurations for AI personas - Section 11: Vibe/Design';

-- Indexes
CREATE INDEX idx_vibe_profiles_workspace ON public.vibe_profiles(workspace_id);
CREATE INDEX idx_vibe_profiles_default ON public.vibe_profiles(workspace_id, is_default) WHERE is_default = true;
CREATE INDEX idx_vibe_phrases_profile ON public.vibe_phrases(vibe_profile_id);
CREATE INDEX idx_vibe_phrases_type ON public.vibe_phrases(phrase_type);

-- Trigger for updated_at
CREATE TRIGGER update_vibe_profiles_updated_at
  BEFORE UPDATE ON public.vibe_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();