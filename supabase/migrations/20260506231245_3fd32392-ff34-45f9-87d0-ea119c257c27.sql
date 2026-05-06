
-- ============================================================================
-- Fase 1O.1 — VoiceHub Foundation
-- ============================================================================

-- 1) voice_provider_instances ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_provider_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_name text NOT NULL CHECK (provider_name IN ('mock','nvoip','twilio','zenvia','totalvoice','vozio','voip_do_brasil','threecx','asterisk','sip','other')),
  display_name text,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','error','pending_setup')),
  base_url text,
  account_id text,
  api_key_secret_name text,
  api_token_secret_name text,
  webhook_token text,
  default_country text NOT NULL DEFAULT 'PT',
  default_country_code text NOT NULL DEFAULT '+351',
  default_currency text NOT NULL DEFAULT 'EUR',
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('demo','sandbox','production')),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_provider_instances_ws ON public.voice_provider_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_voice_provider_instances_status ON public.voice_provider_instances(workspace_id, status);

ALTER TABLE public.voice_provider_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage voice_provider_instances"
  ON public.voice_provider_instances FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_provider_instances.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_provider_instances.workspace_id AND wm.user_id = auth.uid()));

CREATE TRIGGER trg_voice_provider_instances_updated_at
  BEFORE UPDATE ON public.voice_provider_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) voice_numbers ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_instance_id uuid REFERENCES public.voice_provider_instances(id) ON DELETE SET NULL,
  number text NOT NULL,
  normalized_number text NOT NULL,
  country text NOT NULL DEFAULT 'PT',
  country_code text NOT NULL DEFAULT '+351',
  number_type text CHECK (number_type IN ('fixed','mobile','toll_free','local','national','international','sip','virtual')),
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','porting','pending','error')),
  porting_status text CHECK (porting_status IN ('not_applicable','requested','in_progress','completed','failed')),
  assigned_team_id uuid,
  assigned_user_id uuid,
  default_use text CHECK (default_use IN ('sales','support','general','billing','clinic','training','other')),
  inbound_enabled boolean NOT NULL DEFAULT true,
  outbound_enabled boolean NOT NULL DEFAULT true,
  recording_enabled boolean NOT NULL DEFAULT false,
  transcription_enabled boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_numbers_ws ON public.voice_numbers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_voice_numbers_normalized ON public.voice_numbers(workspace_id, normalized_number);
CREATE INDEX IF NOT EXISTS idx_voice_numbers_provider ON public.voice_numbers(provider_instance_id);

ALTER TABLE public.voice_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage voice_numbers"
  ON public.voice_numbers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_numbers.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_numbers.workspace_id AND wm.user_id = auth.uid()));

CREATE TRIGGER trg_voice_numbers_updated_at
  BEFORE UPDATE ON public.voice_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) voice_call_outcomes ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_call_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  category text CHECK (category IN ('sales','support','scheduling','billing','general')),
  requires_followup boolean NOT NULL DEFAULT false,
  suggested_next_action text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_voice_call_outcomes_ws ON public.voice_call_outcomes(workspace_id, active);

ALTER TABLE public.voice_call_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage voice_call_outcomes"
  ON public.voice_call_outcomes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_outcomes.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_outcomes.workspace_id AND wm.user_id = auth.uid()));

CREATE TRIGGER trg_voice_call_outcomes_updated_at
  BEFORE UPDATE ON public.voice_call_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) voice_call_logs --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_instance_id uuid REFERENCES public.voice_provider_instances(id) ON DELETE SET NULL,
  voice_number_id uuid REFERENCES public.voice_numbers(id) ON DELETE SET NULL,
  communication_conversation_id uuid,
  contact_id uuid,
  lead_id uuid,
  customer_id uuid,
  deal_id uuid,
  ticket_id uuid,
  appointment_id uuid,
  product_id uuid,
  assigned_to uuid,
  created_by uuid,
  call_direction text NOT NULL CHECK (call_direction IN ('inbound','outbound','internal','missed','scheduled')),
  call_type text NOT NULL DEFAULT 'phone_call' CHECK (call_type IN ('phone_call','voip_call','whatsapp_call','whatsapp_video_call','video_meeting','voicemail','call_note')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled','ringing','in_progress','completed','missed','failed','cancelled','no_answer','voicemail','transferred','recorded','transcribed')),
  from_number text,
  to_number text,
  normalized_from_number text,
  normalized_to_number text,
  country text NOT NULL DEFAULT 'PT',
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  ring_duration_seconds integer,
  subject text,
  notes text,
  outcome text,
  recording_url text,
  recording_status text NOT NULL DEFAULT 'not_available' CHECK (recording_status IN ('not_available','pending','available','failed','deleted')),
  transcription_status text NOT NULL DEFAULT 'not_available' CHECK (transcription_status IN ('not_available','pending','processing','completed','failed')),
  transcription_text text,
  ai_summary text,
  ai_intent text,
  ai_sentiment text,
  ai_next_action text,
  provider_call_id text,
  provider_status text,
  cost_amount numeric(12,4),
  currency text NOT NULL DEFAULT 'EUR',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_ws_created ON public.voice_call_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_contact ON public.voice_call_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_ticket ON public.voice_call_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_deal ON public.voice_call_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_assigned ON public.voice_call_logs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_direction_status ON public.voice_call_logs(workspace_id, call_direction, status);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_provider_call_id ON public.voice_call_logs(provider_call_id) WHERE provider_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_conversation ON public.voice_call_logs(communication_conversation_id);

ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read voice_call_logs"
  ON public.voice_call_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_logs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members insert voice_call_logs"
  ON public.voice_call_logs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_logs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members update voice_call_logs"
  ON public.voice_call_logs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_logs.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "members delete voice_call_logs"
  ON public.voice_call_logs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_call_logs.workspace_id AND wm.user_id = auth.uid()));

CREATE TRIGGER trg_voice_call_logs_updated_at
  BEFORE UPDATE ON public.voice_call_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) voice_provider_logs ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_provider_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_instance_id uuid REFERENCES public.voice_provider_instances(id) ON DELETE SET NULL,
  provider_name text,
  event_type text,
  direction text CHECK (direction IN ('inbound','outbound','webhook','status','system')),
  provider_call_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_provider_logs_ws_created ON public.voice_provider_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_provider_logs_call ON public.voice_provider_logs(provider_call_id) WHERE provider_call_id IS NOT NULL;

ALTER TABLE public.voice_provider_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read voice_provider_logs"
  ON public.voice_provider_logs FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_provider_logs.workspace_id AND wm.user_id = auth.uid()));
-- inserts via service_role apenas

-- 6) voice_compliance_settings ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_compliance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recording_allowed boolean NOT NULL DEFAULT false,
  recording_consent_required boolean NOT NULL DEFAULT true,
  recording_notice_message text DEFAULT 'Esta chamada poderá ser gravada para fins de qualidade e formação. Pode recusar a gravação a qualquer momento.',
  retention_days integer,
  allow_manual_delete boolean NOT NULL DEFAULT true,
  country text NOT NULL DEFAULT 'PT',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_compliance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage voice_compliance_settings"
  ON public.voice_compliance_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_compliance_settings.workspace_id AND wm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = voice_compliance_settings.workspace_id AND wm.user_id = auth.uid()));

CREATE TRIGGER trg_voice_compliance_settings_updated_at
  BEFORE UPDATE ON public.voice_compliance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Seed outcomes padrão por workspace ------------------------------------
INSERT INTO public.voice_call_outcomes (workspace_id, name, slug, category, requires_followup, sort_order)
SELECT w.id, x.name, x.slug, x.category, x.requires_followup, x.sort_order
FROM public.workspaces w
CROSS JOIN (VALUES
  ('Interessado','interested','sales',true,10),
  ('Sem interesse','not_interested','sales',false,20),
  ('Precisa de follow-up','followup_needed','general',true,30),
  ('Pediu proposta','proposal_requested','sales',true,40),
  ('Pediu preço','pricing_requested','sales',true,50),
  ('Suporte resolvido','support_resolved','support',false,60),
  ('Suporte por resolver','support_unresolved','support',true,70),
  ('Não atendeu','no_answer','general',true,80),
  ('Número errado','wrong_number','general',false,90),
  ('Reagendado','rescheduled','scheduling',true,100),
  ('Deixou mensagem','voicemail_left','general',true,110),
  ('Outro','other','general',false,120)
) AS x(name,slug,category,requires_followup,sort_order)
ON CONFLICT (workspace_id, slug) DO NOTHING;
