
-- ============================================================================
-- Fase 1N.1 — Knowledge Base FAQs, Gaps, Feedback + Concierge config in widget
-- Reutiliza knowledge_bases, knowledge_documents, knowledge_chunks (pgvector)
-- ============================================================================

-- 1) knowledge_faqs ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  knowledge_base_id uuid REFERENCES public.knowledge_bases(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'pt-PT',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  frequency_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_faqs_workspace ON public.knowledge_faqs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_faqs_kb ON public.knowledge_faqs(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_faqs_status ON public.knowledge_faqs(status, approved);
CREATE INDEX IF NOT EXISTS idx_knowledge_faqs_tags ON public.knowledge_faqs USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_faqs_fts ON public.knowledge_faqs
  USING gin(to_tsvector('portuguese', coalesce(question,'') || ' ' || coalesce(answer,'')));

ALTER TABLE public.knowledge_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read knowledge_faqs"
  ON public.knowledge_faqs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_faqs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members insert knowledge_faqs"
  ON public.knowledge_faqs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_faqs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members update knowledge_faqs"
  ON public.knowledge_faqs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_faqs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members delete knowledge_faqs"
  ON public.knowledge_faqs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_faqs.workspace_id AND wm.user_id = auth.uid()));

CREATE TRIGGER trg_knowledge_faqs_updated_at
  BEFORE UPDATE ON public.knowledge_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) knowledge_gaps ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  widget_id uuid,
  session_id uuid,
  conversation_id uuid,
  question text NOT NULL,
  suggested_topic text,
  frequency_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','dismissed')),
  resolved_by uuid,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_workspace ON public.knowledge_gaps(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON public.knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_widget ON public.knowledge_gaps(widget_id);

ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read knowledge_gaps"
  ON public.knowledge_gaps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_gaps.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members update knowledge_gaps"
  ON public.knowledge_gaps FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_gaps.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members delete knowledge_gaps"
  ON public.knowledge_gaps FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = knowledge_gaps.workspace_id AND wm.user_id = auth.uid()));
-- INSERT feito pela edge function (service_role) — não precisa policy authenticated

CREATE TRIGGER trg_knowledge_gaps_updated_at
  BEFORE UPDATE ON public.knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) concierge_answer_feedback ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.concierge_answer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  session_id uuid,
  conversation_id uuid,
  message_id uuid,
  feedback text NOT NULL CHECK (feedback IN ('useful','not_useful','corrected')),
  corrected_answer text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_concierge_feedback_workspace ON public.concierge_answer_feedback(workspace_id);
CREATE INDEX IF NOT EXISTS idx_concierge_feedback_message ON public.concierge_answer_feedback(message_id);

ALTER TABLE public.concierge_answer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read concierge_feedback"
  ON public.concierge_answer_feedback FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = concierge_answer_feedback.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members insert concierge_feedback"
  ON public.concierge_answer_feedback FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = concierge_answer_feedback.workspace_id AND wm.user_id = auth.uid()));

-- 4) Concierge config no widget ---------------------------------------------
ALTER TABLE public.website_chat_widgets
  ADD COLUMN IF NOT EXISTS concierge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS concierge_mode text NOT NULL DEFAULT 'assisted'
    CHECK (concierge_mode IN ('off','assisted','controlled_auto','hybrid')),
  ADD COLUMN IF NOT EXISTS knowledge_base_id uuid REFERENCES public.knowledge_bases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS concierge_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'confidence_threshold', 0.75,
    'max_auto_replies_per_session', 5,
    'handoff_on_low_confidence', true,
    'handoff_on_complaint', true,
    'handoff_on_pricing_question', false,
    'handoff_on_purchase_intent', true,
    'allow_product_recommendations', true,
    'allow_appointment_suggestions', true,
    'collect_lead_before_handoff', true,
    'show_sources_to_agent', true,
    'show_sources_to_visitor', false,
    'fallback_message', 'Não tenho informação suficiente para responder com segurança. Posso encaminhar o seu pedido para a equipa?',
    'tone', 'professional',
    'language', 'pt-PT',
    'use_only_approved_knowledge', true
  );
