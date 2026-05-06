
-- ============================================================
-- FASE 1M.1 — Website Chat Widget & Lead Capture Engine
-- ============================================================

-- 1) WIDGETS
CREATE TABLE IF NOT EXISTS public.website_chat_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  domain_allowlist TEXT[] NOT NULL DEFAULT '{}',
  default_language TEXT NOT NULL DEFAULT 'pt-PT',
  timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  assigned_team_id UUID,
  assigned_user_id UUID,
  handoff_channel TEXT NOT NULL DEFAULT 'fastcrm_inbox' CHECK (handoff_channel IN ('fastcrm_inbox','whatsapp','email','ticket','appointment')),
  whatsapp_number TEXT,
  welcome_message TEXT DEFAULT 'Olá! Como podemos ajudar?',
  offline_message TEXT DEFAULT 'Estamos offline. Deixe-nos uma mensagem e responderemos em breve.',
  lead_capture_required BOOLEAN NOT NULL DEFAULT false,
  lead_capture_timing TEXT NOT NULL DEFAULT 'after_first_message' CHECK (lead_capture_timing IN ('before_chat','after_first_message','before_handoff','optional')),
  collect_name BOOLEAN NOT NULL DEFAULT true,
  collect_email BOOLEAN NOT NULL DEFAULT true,
  collect_phone BOOLEAN NOT NULL DEFAULT true,
  collect_company BOOLEAN NOT NULL DEFAULT false,
  collect_intent BOOLEAN NOT NULL DEFAULT true,
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  behavior_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  qualification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wcw_workspace ON public.website_chat_widgets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wcw_public_key ON public.website_chat_widgets(public_key);

-- 2) SESSÕES
CREATE TABLE IF NOT EXISTS public.website_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  widget_id UUID NOT NULL REFERENCES public.website_chat_widgets(id) ON DELETE CASCADE,
  communication_conversation_id UUID,
  contact_id UUID,
  lead_id UUID,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  visitor_company TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','waiting_for_agent','handed_off','resolved','abandoned','spam')),
  current_page_url TEXT,
  landing_page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wcs_workspace ON public.website_chat_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wcs_widget ON public.website_chat_sessions(widget_id);
CREATE INDEX IF NOT EXISTS idx_wcs_visitor ON public.website_chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_wcs_status ON public.website_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_wcs_conversation ON public.website_chat_sessions(communication_conversation_id);

-- 3) MENSAGENS
CREATE TABLE IF NOT EXISTS public.website_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.website_chat_sessions(id) ON DELETE CASCADE,
  communication_message_id UUID,
  direction TEXT NOT NULL CHECK (direction IN ('visitor','agent','bot','system')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','form','quick_reply','product','file','system')),
  content TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wcm_workspace ON public.website_chat_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wcm_session ON public.website_chat_messages(session_id, created_at);

-- 4) LEAD CAPTURES
CREATE TABLE IF NOT EXISTS public.website_lead_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  widget_id UUID NOT NULL REFERENCES public.website_chat_widgets(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.website_chat_sessions(id) ON DELETE CASCADE,
  contact_id UUID,
  lead_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  intent TEXT,
  qualification_score NUMERIC,
  qualification_status TEXT NOT NULL DEFAULT 'new' CHECK (qualification_status IN ('new','qualified','unqualified','needs_review','spam')),
  source_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  raw_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  ai_recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wlc_workspace ON public.website_lead_captures(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wlc_widget ON public.website_lead_captures(widget_id);
CREATE INDEX IF NOT EXISTS idx_wlc_session ON public.website_lead_captures(session_id);
CREATE INDEX IF NOT EXISTS idx_wlc_status ON public.website_lead_captures(qualification_status);

-- 5) REGRAS DE QUALIFICAÇÃO
CREATE TABLE IF NOT EXISTS public.lead_qualification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  widget_id UUID REFERENCES public.website_chat_widgets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  score_points INTEGER NOT NULL DEFAULT 0,
  resulting_status TEXT CHECK (resulting_status IN ('qualified','unqualified','needs_review','spam')),
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lqr_workspace ON public.lead_qualification_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lqr_widget ON public.lead_qualification_rules(widget_id);

-- 6) SECURITY LOGS
CREATE TABLE IF NOT EXISTS public.website_widget_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  widget_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  ip_hash TEXT,
  user_agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wwsl_workspace ON public.website_widget_security_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wwsl_widget ON public.website_widget_security_logs(widget_id, created_at DESC);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at_widgets()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_wcw') THEN
    CREATE TRIGGER set_updated_at_wcw BEFORE UPDATE ON public.website_chat_widgets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_widgets();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_wcs') THEN
    CREATE TRIGGER set_updated_at_wcs BEFORE UPDATE ON public.website_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_widgets();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_wlc') THEN
    CREATE TRIGGER set_updated_at_wlc BEFORE UPDATE ON public.website_lead_captures FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_widgets();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_updated_at_lqr') THEN
    CREATE TRIGGER set_updated_at_lqr BEFORE UPDATE ON public.lead_qualification_rules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_widgets();
  END IF;
END $$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.website_chat_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_lead_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_qualification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_widget_security_logs ENABLE ROW LEVEL SECURITY;

-- Helper: detect workspace membership (assume existing function is_workspace_member)
-- If not present we fall back to workspace_members check.

-- WIDGETS
CREATE POLICY "wcw_select_members" ON public.website_chat_widgets FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_widgets.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "wcw_admin_all" ON public.website_chat_widgets FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_widgets.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_widgets.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')));

-- SESSIONS
CREATE POLICY "wcs_select_members" ON public.website_chat_sessions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_sessions.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "wcs_update_members" ON public.website_chat_sessions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_sessions.workspace_id AND wm.user_id = auth.uid()));

-- MESSAGES
CREATE POLICY "wcm_select_members" ON public.website_chat_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_messages.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "wcm_insert_members" ON public.website_chat_messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_chat_messages.workspace_id AND wm.user_id = auth.uid()));

-- LEAD CAPTURES
CREATE POLICY "wlc_select_members" ON public.website_lead_captures FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_lead_captures.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "wlc_update_members" ON public.website_lead_captures FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_lead_captures.workspace_id AND wm.user_id = auth.uid()));

-- RULES (admin only)
CREATE POLICY "lqr_select_members" ON public.lead_qualification_rules FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = lead_qualification_rules.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "lqr_admin_all" ON public.lead_qualification_rules FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = lead_qualification_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = lead_qualification_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')));

-- SECURITY LOGS (members read)
CREATE POLICY "wwsl_select_members" ON public.website_widget_security_logs FOR SELECT TO authenticated
USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = website_widget_security_logs.workspace_id AND wm.user_id = auth.uid()));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_chat_sessions;
