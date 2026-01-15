-- Knowledge Bases table
CREATE TABLE public.knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general', -- atendimento, vendas, formacao, consultoria, saude, produto, interna
  is_active BOOLEAN DEFAULT true,
  allowed_channels TEXT[] DEFAULT ARRAY['inbox', 'chat', 'email'],
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge Sources table (URLs, documents, manual)
CREATE TABLE public.knowledge_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- url, document, manual, faq
  source_url TEXT,
  source_file_path TEXT,
  original_content TEXT,
  processed_content TEXT,
  extracted_topics TEXT[],
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error TEXT,
  last_processed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge Entries (individual pieces of knowledge)
CREATE TABLE public.knowledge_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'content', -- content, faq, procedure, script, protocol
  title TEXT NOT NULL,
  question TEXT, -- for FAQ entries
  content TEXT NOT NULL,
  summary TEXT,
  keywords TEXT[],
  status TEXT NOT NULL DEFAULT 'draft', -- draft, validated, expired
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Personas table
CREATE TABLE public.ai_personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  persona_type TEXT NOT NULL, -- atendimento, comercial, formador, terapeuta, suporte
  tone_of_voice TEXT NOT NULL DEFAULT 'empático', -- empático, direto, educativo, técnico
  technical_depth TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  language_style TEXT DEFAULT 'conversational', -- formal, conversational, casual
  system_prompt TEXT,
  limitations TEXT[], -- things the AI should NOT do
  knowledge_base_ids UUID[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge Usage Logs (for metrics and learning)
CREATE TABLE public.knowledge_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE SET NULL,
  entry_id UUID REFERENCES public.knowledge_entries(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  context TEXT NOT NULL, -- inbox, vendas, suporte, etc
  query TEXT NOT NULL,
  response TEXT,
  response_source TEXT, -- knowledge_base, fallback, human
  confidence_score NUMERIC(3,2),
  was_helpful BOOLEAN,
  feedback TEXT,
  resulted_in_conversion BOOLEAN,
  resulted_in_meeting BOOLEAN,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FAQ Suggestions (AI-generated from patterns)
CREATE TABLE public.knowledge_faq_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  suggested_answer TEXT,
  frequency INTEGER DEFAULT 1,
  source_queries TEXT[],
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_faq_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view knowledge bases in their workspace" ON public.knowledge_bases
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage knowledge bases in their workspace" ON public.knowledge_bases
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view knowledge sources in their workspace" ON public.knowledge_sources
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage knowledge sources in their workspace" ON public.knowledge_sources
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view knowledge entries in their workspace" ON public.knowledge_entries
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage knowledge entries in their workspace" ON public.knowledge_entries
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view AI personas in their workspace" ON public.ai_personas
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage AI personas in their workspace" ON public.ai_personas
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view knowledge usage in their workspace" ON public.knowledge_usage_logs
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert knowledge usage in their workspace" ON public.knowledge_usage_logs
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view FAQ suggestions in their workspace" ON public.knowledge_faq_suggestions
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage FAQ suggestions in their workspace" ON public.knowledge_faq_suggestions
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_knowledge_bases_workspace ON public.knowledge_bases(workspace_id);
CREATE INDEX idx_knowledge_sources_base ON public.knowledge_sources(knowledge_base_id);
CREATE INDEX idx_knowledge_entries_base ON public.knowledge_entries(knowledge_base_id);
CREATE INDEX idx_knowledge_entries_status ON public.knowledge_entries(status);
CREATE INDEX idx_ai_personas_workspace ON public.ai_personas(workspace_id);
CREATE INDEX idx_knowledge_usage_workspace ON public.knowledge_usage_logs(workspace_id);
CREATE INDEX idx_knowledge_usage_created ON public.knowledge_usage_logs(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_sources_updated_at BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_entries_updated_at BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_personas_updated_at BEFORE UPDATE ON public.ai_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();