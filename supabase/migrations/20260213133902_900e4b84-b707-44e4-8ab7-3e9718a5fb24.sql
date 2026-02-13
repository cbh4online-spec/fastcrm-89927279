
-- 1.1 Add new columns to communication_templates
ALTER TABLE public.communication_templates
  ADD COLUMN IF NOT EXISTS structure_families TEXT[] DEFAULT '{AIDA}',
  ADD COLUMN IF NOT EXISTS schema_blocks JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_constraints JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_length_by_channel JSONB DEFAULT '{"whatsapp": 350, "email": 1600, "sms": 160, "inbox": 800}';

-- 1.2 New table: persuasion_structures
CREATE TABLE public.persuasion_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'all',
  blocks JSONB NOT NULL DEFAULT '[]',
  constraints JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.persuasion_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read persuasion structures"
  ON public.persuasion_structures FOR SELECT
  USING (true);

-- 1.3 New table: structure_usage_events
CREATE TABLE public.structure_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL,
  conversation_id UUID,
  message_id UUID,
  channel TEXT NOT NULL DEFAULT 'email',
  pipeline_stage TEXT,
  intent_label TEXT,
  sentiment_label TEXT,
  lead_score INTEGER,
  potential_value NUMERIC,
  structure_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.structure_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace structure events"
  ON public.structure_usage_events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workspace structure events"
  ON public.structure_usage_events FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_structure_usage_events_workspace ON public.structure_usage_events(workspace_id);
CREATE INDEX idx_structure_usage_events_key ON public.structure_usage_events(structure_key);

-- 1.4 New table: workspace_structure_stats
CREATE TABLE public.workspace_structure_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  pipeline_stage TEXT,
  intent_label TEXT,
  structure_key TEXT NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  opportunity_rate NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  reply_rate NUMERIC NOT NULL DEFAULT 0,
  avg_time_to_reply_minutes NUMERIC NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_structure_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace structure stats"
  ON public.workspace_structure_stats FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_workspace_structure_stats_ws ON public.workspace_structure_stats(workspace_id);
CREATE INDEX idx_workspace_structure_stats_key ON public.workspace_structure_stats(structure_key);

-- 1.5 Seed: 7 persuasion structures
INSERT INTO public.persuasion_structures (key, label, channel, blocks, constraints) VALUES
('AIDA', 'AIDA — Atenção, Interesse, Desejo, Ação', 'all',
 '[{"position":1,"name":"Attention","description":"Hook que capta atenção imediata. Pergunta provocativa ou dado surpreendente.","required":true},{"position":2,"name":"Interest","description":"Insight ou enquadramento do problema. Mostrar que entende a dor.","required":true},{"position":3,"name":"Desire","description":"Resultado concreto, prova social ou benefício tangível.","required":true},{"position":4,"name":"Action","description":"CTA claro e direto. Uma ação específica.","required":true}]',
 '{"max_blocks":4,"cta_style":"direct","tone":"professional"}'),

('PAS', 'PAS — Problema, Agitação, Solução', 'all',
 '[{"position":1,"name":"Problem","description":"Identificar o problema específico do lead.","required":true},{"position":2,"name":"Agitation","description":"Amplificar as consequências de não resolver.","required":true},{"position":3,"name":"Solution","description":"Apresentar a solução + CTA.","required":true}]',
 '{"max_blocks":3,"cta_style":"consultative","tone":"empathetic"}'),

('BAB', 'BAB — Before, After, Bridge', 'all',
 '[{"position":1,"name":"Before","description":"Situação atual do lead (dor/frustração).","required":true},{"position":2,"name":"After","description":"Como seria com o problema resolvido (visão positiva).","required":true},{"position":3,"name":"Bridge","description":"Como chegar lá (a solução) + CTA.","required":true}]',
 '{"max_blocks":3,"cta_style":"aspirational","tone":"strategic"}'),

('4P', '4P — Promise, Picture, Proof, Push', 'all',
 '[{"position":1,"name":"Promise","description":"Promessa principal de valor.","required":true},{"position":2,"name":"Picture","description":"Cenário concreto do resultado.","required":true},{"position":3,"name":"Proof","description":"Evidência: caso, número, testemunho.","required":true},{"position":4,"name":"Push","description":"Urgência ou incentivo + CTA.","required":true}]',
 '{"max_blocks":4,"cta_style":"urgency","tone":"confident"}'),

('AIDAShort', 'AIDA Short — WhatsApp/SMS', 'whatsapp',
 '[{"position":1,"name":"Hook","description":"Uma frase de impacto. Pergunta ou dado.","required":true},{"position":2,"name":"Insight","description":"1-2 frases com o valor/benefício.","required":true},{"position":3,"name":"CTA","description":"Pergunta simples para continuar conversa.","required":true}]',
 '{"max_blocks":3,"max_length":350,"cta_style":"question","tone":"casual_professional"}'),

('ObjectionHandling', 'Objeção — Reconhecer, Reframing, Evidência', 'all',
 '[{"position":1,"name":"Acknowledge","description":"Validar a objeção do lead com empatia.","required":true},{"position":2,"name":"Reframe","description":"Recontextualizar a objeção como oportunidade.","required":true},{"position":3,"name":"Evidence","description":"Prova concreta que resolve a objeção.","required":true},{"position":4,"name":"CTA","description":"Próximo passo claro.","required":true}]',
 '{"max_blocks":4,"cta_style":"consultative","tone":"empathetic_confident"}'),

('DemoInvite', 'Demo Invite — Convite para Demonstração', 'all',
 '[{"position":1,"name":"PersonalizedHook","description":"Referência personalizada ao lead/empresa.","required":true},{"position":2,"name":"ValueProp","description":"Benefício específico da demo para este lead.","required":true},{"position":3,"name":"SimpleCTA","description":"CTA simples: agendar ou confirmar interesse.","required":true}]',
 '{"max_blocks":3,"cta_style":"simple","tone":"direct_friendly"}');
