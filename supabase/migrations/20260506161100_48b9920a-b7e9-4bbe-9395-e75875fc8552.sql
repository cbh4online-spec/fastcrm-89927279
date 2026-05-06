
-- =====================================================
-- FASE 1I — Conversation Quality & Coaching AI
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversation_quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  conversation_id uuid,
  ticket_id uuid,
  contact_id uuid,
  agent_id uuid,
  reviewed_by uuid,
  review_type text NOT NULL DEFAULT 'conversation',
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'completed',
  overall_score numeric,
  clarity_score numeric,
  empathy_score numeric,
  commercial_score numeric,
  resolution_score numeric,
  followup_score numeric,
  objection_handling_score numeric,
  professionalism_score numeric,
  speed_context_score numeric,
  compliance_risk_score numeric,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvement_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  missed_opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  objections_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_next_action text,
  improved_reply_example text,
  coaching_note text,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_ai_response jsonb,
  model_provider text,
  model_name text,
  confidence numeric,
  analyzed_message_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cqr_workspace ON public.conversation_quality_reviews(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cqr_conversation ON public.conversation_quality_reviews(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cqr_ticket ON public.conversation_quality_reviews(ticket_id);
CREATE INDEX IF NOT EXISTS idx_cqr_agent ON public.conversation_quality_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_cqr_created ON public.conversation_quality_reviews(workspace_id, created_at DESC);

ALTER TABLE public.conversation_quality_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.agent_coaching_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  conversations_analyzed integer NOT NULL DEFAULT 0,
  avg_quality_score numeric,
  avg_clarity_score numeric,
  avg_empathy_score numeric,
  avg_commercial_score numeric,
  avg_resolution_score numeric,
  avg_followup_score numeric,
  recurring_strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  recurring_improvement_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  coaching_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_training_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  example_good_replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  example_improved_replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, agent_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_aci_workspace_agent ON public.agent_coaching_insights(workspace_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_aci_period ON public.agent_coaching_insights(workspace_id, period_end DESC);

ALTER TABLE public.agent_coaching_insights ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.objection_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  objection_type text NOT NULL,
  title text NOT NULL,
  description text,
  real_example text,
  suggested_response text,
  improved_response text,
  source_conversation_id uuid,
  source_ticket_id uuid,
  frequency_count integer NOT NULL DEFAULT 1,
  effectiveness_notes text,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  is_template boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objlib_workspace ON public.objection_library(workspace_id);
CREATE INDEX IF NOT EXISTS idx_objlib_type ON public.objection_library(objection_type);
CREATE INDEX IF NOT EXISTS idx_objlib_template ON public.objection_library(is_template) WHERE is_template = true;

ALTER TABLE public.objection_library ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  trigger_intents text[] NOT NULL DEFAULT '{}',
  trigger_objections text[] NOT NULL DEFAULT '{}',
  description text,
  recommended_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  example_opening text,
  example_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  example_responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  closing_cta text,
  do_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  dont_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  is_template boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playbook_workspace ON public.conversation_playbooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_playbook_category ON public.conversation_playbooks(category);
CREATE INDEX IF NOT EXISTS idx_playbook_template ON public.conversation_playbooks(is_template) WHERE is_template = true;

ALTER TABLE public.conversation_playbooks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.coaching_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  created_by uuid,
  source_review_id uuid REFERENCES public.conversation_quality_reviews(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  training_topic text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ctasks_workspace_agent ON public.coaching_tasks(workspace_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_ctasks_status ON public.coaching_tasks(workspace_id, status);

ALTER TABLE public.coaching_tasks ENABLE ROW LEVEL SECURITY;

-- Helper: manager/admin do workspace (owner/admin no enum, ou role_type 'lead'/'manager' em agent_profiles, ou super admin)
CREATE OR REPLACE FUNCTION public.is_workspace_manager_or_admin(_workspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = _workspace_id
        AND user_id = _user_id
        AND role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.agent_profiles
      WHERE workspace_id = _workspace_id
        AND user_id = _user_id
        AND role_type IN ('manager','support_lead','sales_lead','lead')
    )
    OR public.is_super_admin(_user_id);
$$;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_cqr_updated ON public.conversation_quality_reviews;
CREATE TRIGGER trg_cqr_updated BEFORE UPDATE ON public.conversation_quality_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_aci_updated ON public.agent_coaching_insights;
CREATE TRIGGER trg_aci_updated BEFORE UPDATE ON public.agent_coaching_insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_objlib_updated ON public.objection_library;
CREATE TRIGGER trg_objlib_updated BEFORE UPDATE ON public.objection_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_playbook_updated ON public.conversation_playbooks;
CREATE TRIGGER trg_playbook_updated BEFORE UPDATE ON public.conversation_playbooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ctasks_updated ON public.coaching_tasks;
CREATE TRIGGER trg_ctasks_updated BEFORE UPDATE ON public.coaching_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS Policies
-- =====================================================

CREATE POLICY "cqr_select_own_or_manager" ON public.conversation_quality_reviews
FOR SELECT TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid()) AND (
    agent_id = auth.uid()
    OR reviewed_by = auth.uid()
    OR public.is_workspace_manager_or_admin(workspace_id, auth.uid())
  )
);

CREATE POLICY "cqr_insert_member" ON public.conversation_quality_reviews
FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "cqr_update_manager" ON public.conversation_quality_reviews
FOR UPDATE TO authenticated
USING (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

CREATE POLICY "cqr_delete_manager" ON public.conversation_quality_reviews
FOR DELETE TO authenticated
USING (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

CREATE POLICY "aci_select_own_or_manager" ON public.agent_coaching_insights
FOR SELECT TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid()) AND (
    agent_id = auth.uid()
    OR public.is_workspace_manager_or_admin(workspace_id, auth.uid())
  )
);

CREATE POLICY "aci_insert_manager" ON public.agent_coaching_insights
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

CREATE POLICY "aci_update_manager" ON public.agent_coaching_insights
FOR UPDATE TO authenticated
USING (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

CREATE POLICY "aci_delete_manager" ON public.agent_coaching_insights
FOR DELETE TO authenticated
USING (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

CREATE POLICY "objlib_select" ON public.objection_library
FOR SELECT TO authenticated
USING (
  is_template = true
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()))
);

CREATE POLICY "objlib_insert_member" ON public.objection_library
FOR INSERT TO authenticated
WITH CHECK (
  is_template = false
  AND workspace_id IS NOT NULL
  AND is_workspace_member(workspace_id, auth.uid())
);

CREATE POLICY "objlib_update_member" ON public.objection_library
FOR UPDATE TO authenticated
USING (
  is_template = false
  AND workspace_id IS NOT NULL
  AND is_workspace_member(workspace_id, auth.uid())
);

CREATE POLICY "objlib_delete_manager" ON public.objection_library
FOR DELETE TO authenticated
USING (
  is_template = false
  AND workspace_id IS NOT NULL
  AND public.is_workspace_manager_or_admin(workspace_id, auth.uid())
);

CREATE POLICY "playbook_select" ON public.conversation_playbooks
FOR SELECT TO authenticated
USING (
  is_template = true
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id, auth.uid()))
);

CREATE POLICY "playbook_insert_member" ON public.conversation_playbooks
FOR INSERT TO authenticated
WITH CHECK (
  is_template = false
  AND workspace_id IS NOT NULL
  AND is_workspace_member(workspace_id, auth.uid())
);

CREATE POLICY "playbook_update_member" ON public.conversation_playbooks
FOR UPDATE TO authenticated
USING (
  is_template = false
  AND workspace_id IS NOT NULL
  AND is_workspace_member(workspace_id, auth.uid())
);

CREATE POLICY "playbook_delete_manager" ON public.conversation_playbooks
FOR DELETE TO authenticated
USING (
  is_template = false
  AND workspace_id IS NOT NULL
  AND public.is_workspace_manager_or_admin(workspace_id, auth.uid())
);

CREATE POLICY "ctasks_select_own_or_manager" ON public.coaching_tasks
FOR SELECT TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid()) AND (
    agent_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_workspace_manager_or_admin(workspace_id, auth.uid())
  )
);

CREATE POLICY "ctasks_insert_manager" ON public.coaching_tasks
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

CREATE POLICY "ctasks_update_own_or_manager" ON public.coaching_tasks
FOR UPDATE TO authenticated
USING (
  is_workspace_member(workspace_id, auth.uid()) AND (
    agent_id = auth.uid()
    OR public.is_workspace_manager_or_admin(workspace_id, auth.uid())
  )
);

CREATE POLICY "ctasks_delete_manager" ON public.coaching_tasks
FOR DELETE TO authenticated
USING (public.is_workspace_manager_or_admin(workspace_id, auth.uid()));

-- =====================================================
-- SEED PT-PT — Playbooks (templates globais)
-- =====================================================
INSERT INTO public.conversation_playbooks (workspace_id, name, category, description, example_opening, example_questions, example_responses, closing_cta, do_list, dont_list, is_template, active) VALUES
(NULL, 'Pedido de preço', 'sales',
 'Cliente pergunta diretamente o preço de um produto ou serviço.',
 'Olá {{nome}}, obrigado pelo interesse! Antes de partilhar valores, posso fazer-lhe duas perguntas rápidas para garantir que lhe envio a melhor proposta?',
 '["Para quantas pessoas / que volume?", "Tem alguma data prevista?", "Já trabalhou com algo semelhante antes?"]'::jsonb,
 '["O valor depende de {{fator}}. Para o seu caso específico, fica entre {{range}}.", "Posso enviar-lhe uma proposta personalizada por email ainda hoje."]'::jsonb,
 'Posso enviar a proposta detalhada agora?',
 '["Qualificar antes de dar preço", "Justificar o valor", "Dar próximo passo claro"]'::jsonb,
 '["Dar preço sem contexto", "Pedir desculpa pelo preço", "Deixar a conversa em aberto"]'::jsonb,
 true, true),
(NULL, 'Objeção de preço', 'objection',
 'Cliente diz que está caro ou compara com alternativas mais baratas.',
 'Compreendo a sua preocupação com o investimento. Posso explicar o que está incluído?',
 '["O que está a comparar exatamente?", "Qual é o orçamento que tinha em mente?", "Que resultado espera obter?"]'::jsonb,
 '["O nosso valor inclui {{benefícios}}, o que normalmente representa {{poupança}} a médio prazo.", "Temos opções modulares que podem ajustar-se ao seu orçamento."]'::jsonb,
 'Quer que lhe mostre uma simulação adaptada?',
 '["Reforçar valor percebido", "Apresentar alternativas modulares", "Confirmar orçamento real"]'::jsonb,
 '["Baixar preço imediatamente", "Desvalorizar a concorrência", "Discutir o preço sem contexto"]'::jsonb,
 true, true),
(NULL, 'Cliente indeciso', 'sales',
 'Cliente demonstra interesse mas adia decisão.',
 'Pelo que percebi, o {{produto}} faz sentido para si. O que falta para avançar?',
 '["O que o faria decidir hoje?", "Quem mais participa na decisão?", "Há alguma dúvida que ainda não esclarecemos?"]'::jsonb,
 '["Posso enviar-lhe um caso de sucesso semelhante.", "Podemos começar com {{plano_pequeno}} para testar."]'::jsonb,
 'Marcamos uma conversa de 15 minutos esta semana?',
 '["Identificar o bloqueio real", "Reduzir risco percebido", "Propor passo pequeno"]'::jsonb,
 '["Pressionar com urgência falsa", "Ignorar o adiamento", "Enviar mais informação genérica"]'::jsonb,
 true, true),
(NULL, 'Reclamação', 'complaint',
 'Cliente expressa insatisfação ou queixa.',
 'Lamento muito por esta situação, {{nome}}. Vou tratar disto pessoalmente.',
 '["Pode dar-me o número de encomenda / referência?", "Quando aconteceu exatamente?", "O que esperava que acontecesse?"]'::jsonb,
 '["Vou escalar internamente e dou-lhe resposta em {{prazo}}.", "Compreendo a sua frustração. Vamos resolver isto."]'::jsonb,
 'Posso ligar-lhe hoje às {{hora}} com uma resposta concreta?',
 '["Validar emoção", "Assumir responsabilidade", "Dar prazo concreto"]'::jsonb,
 '["Desculpar a empresa", "Culpar o cliente", "Prometer sem prazo"]'::jsonb,
 true, true),
(NULL, 'Pedido de suporte', 'support',
 'Cliente reporta problema técnico ou dúvida operacional.',
 'Olá {{nome}}, vou ajudar a resolver isto. Pode partilhar mais detalhes?',
 '["Quando começou a acontecer?", "Que mensagem de erro vê?", "Já tentou {{passo_básico}}?"]'::jsonb,
 '["Vou criar um ticket interno e acompanhar consigo.", "O problema parece ser {{causa}}. Pode tentar {{solução}}?"]'::jsonb,
 'Confirma se ficou resolvido depois deste passo?',
 '["Reproduzir o problema", "Confirmar resolução", "Documentar para a base de conhecimento"]'::jsonb,
 '["Fechar sem confirmar resolução", "Dar respostas vagas", "Esquecer follow-up"]'::jsonb,
 true, true),
(NULL, 'Agendamento de demonstração', 'appointment',
 'Cliente quer ver o produto em ação.',
 'Ótimo! As demonstrações duram cerca de {{duração}} e são personalizadas. Que dia funciona melhor?',
 '["Quem mais vai estar presente?", "O que é mais importante ver?", "Prefere manhã ou tarde?"]'::jsonb,
 '["Tenho disponibilidade {{slots}}.", "Envio convite com link agora mesmo."]'::jsonb,
 'Confirma o slot {{data}} às {{hora}}?',
 '["Confirmar agenda", "Enviar convite calendar", "Lembrete 24h antes"]'::jsonb,
 '["Marcar sem confirmar", "Esquecer envio do link", "Não fazer follow-up se não comparecer"]'::jsonb,
 true, true),
(NULL, 'Envio de produto', 'product_recommendation',
 'Agente envia ficha de produto via WhatsApp.',
 'Aqui está a informação do {{produto}} que pediu. Posso responder a alguma dúvida?',
 '["Faz sentido para o seu caso?", "Quer ver alternativas?", "Quer ver disponibilidade?"]'::jsonb,
 '["Posso adicionar ao carrinho e enviar checkout.", "Tenho stock disponível para entrega imediata."]'::jsonb,
 'Avançamos com a encomenda?',
 '["Personalizar mensagem", "Sugerir próximo passo", "Confirmar disponibilidade"]'::jsonb,
 '["Enviar ficha sem contexto", "Esquecer próximo passo", "Não acompanhar"]'::jsonb,
 true, true),
(NULL, 'Follow-up sem resposta', 'followup',
 'Conversa parou e cliente não respondeu.',
 'Olá {{nome}}, voltei a passar para confirmar se tem alguma dúvida sobre {{contexto}}.',
 '["O timing ainda faz sentido?", "Posso ajudar com mais informação?", "Prefere que volte a contactar daqui a {{prazo}}?"]'::jsonb,
 '["Sem pressão. Diga-me apenas se ainda faz sentido.", "Deixo aqui um caso parecido que pode interessar."]'::jsonb,
 'Faz sentido continuarmos a conversa?',
 '["Reabrir com leveza", "Adicionar valor novo", "Dar opção de adiar"]'::jsonb,
 '["Repetir a mesma mensagem", "Soar insistente", "Fechar oportunidade sem perguntar"]'::jsonb,
 true, true),
(NULL, 'Reativação', 'retention',
 'Cliente inativo há muito tempo.',
 'Olá {{nome}}, há algum tempo que não falamos. Tudo bem?',
 '["Como têm corrido as coisas?", "Houve alguma mudança no seu lado?", "Posso atualizar-lhe sobre novidades?"]'::jsonb,
 '["Temos novidades em {{área}} que podem interessar.", "Posso oferecer-lhe condições especiais para regressar."]'::jsonb,
 'Quer agendar uma conversa rápida?',
 '["Tom genuíno", "Trazer novidade real", "Oferecer condição clara"]'::jsonb,
 '["Soar comercial à força", "Ignorar histórico", "Pressionar"]'::jsonb,
 true, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.objection_library (workspace_id, objection_type, title, description, real_example, suggested_response, improved_response, tags, is_template, active) VALUES
(NULL, 'preço', 'Está caro / acima do orçamento',
 'Cliente considera o valor elevado face às suas expectativas.',
 'Está fora do meu orçamento.',
 'Compreendo. Posso explicar o que está incluído e mostrar opções mais ajustadas?',
 'Compreendo perfeitamente. O valor reflete {{benefícios concretos}}. Que orçamento tinha em mente? Tenho opções modulares que podem encaixar.',
 ARRAY['preço','orçamento','valor'], true, true),
(NULL, 'confiança', 'Não conheço a empresa',
 'Cliente desconhece marca/serviço e tem dúvidas sobre credibilidade.',
 'Nunca ouvi falar de vocês.',
 'É natural. Posso partilhar alguns casos de clientes semelhantes ao seu?',
 'Faz todo o sentido essa pergunta. Trabalhamos com {{cliente_referência}} e tenho casos públicos que posso enviar. Quer ver?',
 ARRAY['confiança','referências','credibilidade'], true, true),
(NULL, 'timing', 'Agora não é boa altura',
 'Cliente adia decisão por questões de tempo ou prioridade.',
 'Talvez mais para a frente.',
 'Compreendo. Quando faria mais sentido voltar a falar?',
 'Sem pressão. O que normalmente faz sentido é deixar tudo preparado para quando o timing for o certo. Posso enviar a proposta para guardar e voltamos a falar em {{prazo}}?',
 ARRAY['timing','adiar','prioridade'], true, true),
(NULL, 'necessidade', 'Não preciso disto agora',
 'Cliente não vê valor imediato no produto/serviço.',
 'Não tenho essa necessidade.',
 'Compreendo. Posso perguntar como resolve atualmente {{problema}}?',
 'Faz sentido. Muitos clientes diziam o mesmo até descobrirem que {{ganho concreto}}. Posso mostrar-lhe rapidamente?',
 ARRAY['necessidade','valor','prioridade'], true, true),
(NULL, 'comparação', 'Estou a ver alternativas',
 'Cliente está em processo de comparação com concorrência.',
 'Estou a comparar com outros fornecedores.',
 'Faz sentido. O que é mais importante para si nessa decisão?',
 'Excelente abordagem. O que normalmente nos diferencia é {{diferenciador}}. Quer que lhe mostre uma comparação objetiva?',
 ARRAY['concorrência','comparação','decisão'], true, true),
(NULL, 'autoridade', 'Tenho de falar com sócio/chefia',
 'Decisão depende de outra pessoa.',
 'Tenho de validar com o meu sócio.',
 'Claro. Posso preparar materiais que ajudem nessa conversa?',
 'Faz todo o sentido. Para facilitar, posso preparar um resumo de 1 página com os pontos-chave. Em alternativa, podemos fazer uma chamada conjunta?',
 ARRAY['decisor','autoridade','stakeholder'], true, true),
(NULL, 'complexidade', 'Parece complicado de implementar',
 'Cliente preocupa-se com esforço/curva de adoção.',
 'Parece muito complicado.',
 'Compreendo. Tipicamente, o setup leva {{tempo}} e acompanhamos em todos os passos.',
 'Compreendo. Na realidade, o nosso processo está pensado para começar com {{passo simples}} em {{tempo}}. Acompanhamos pessoalmente. Quer ver como?',
 ARRAY['implementação','onboarding','simplicidade'], true, true),
(NULL, 'risco', 'E se não funcionar?',
 'Cliente teme falhar e perder o investimento.',
 'E se não der resultado?',
 'É uma preocupação justa. Temos {{garantia/processo}} para reduzir esse risco.',
 'Ótima pergunta. Por isso temos {{garantia/teste}}. Pode começar com {{compromisso pequeno}} e avaliar antes de avançar.',
 ARRAY['risco','garantia','prova'], true, true),
(NULL, 'urgência', 'Não é urgente para mim',
 'Cliente não sente pressão para decidir.',
 'Não é prioridade neste momento.',
 'Compreendo. Quando deixaria de não ser prioridade?',
 'Faz sentido. Muitas vezes só vira prioridade quando {{evento}}. Quer que volte a falar nessa altura ou prefere deixar pré-aprovado para quando precisar?',
 ARRAY['urgência','prioridade','timing'], true, true),
(NULL, 'outro', 'Vou pensar e depois digo',
 'Resposta evasiva sem objeção concreta.',
 'Vou pensar e depois digo qualquer coisa.',
 'Claro. Há alguma dúvida específica em que posso ajudar a pensar?',
 'Sem problema. Para ajudar nessa reflexão, qual é a dúvida principal? Assim posso enviar-lhe a informação certa em vez de o sobrecarregar.',
 ARRAY['evasão','indecisão','follow-up'], true, true)
ON CONFLICT DO NOTHING;
