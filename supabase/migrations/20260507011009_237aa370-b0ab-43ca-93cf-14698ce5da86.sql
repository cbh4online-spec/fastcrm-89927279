
CREATE TABLE IF NOT EXISTS public.voice_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Lisbon',
  weekly_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  holidays jsonb NOT NULL DEFAULT '[]'::jsonb,
  after_hours_action text NOT NULL DEFAULT 'callback',
  after_hours_message text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vbh_workspace ON public.voice_business_hours(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  first_answer_seconds integer NOT NULL DEFAULT 30,
  missed_call_callback_minutes integer NOT NULL DEFAULT 15,
  voicemail_response_minutes integer NOT NULL DEFAULT 60,
  callback_completion_minutes integer NOT NULL DEFAULT 120,
  priority text NOT NULL DEFAULT 'medium',
  business_hours_only boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vsla_workspace ON public.voice_sla_policies(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  queue_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  assigned_team_id uuid,
  fallback_team_id uuid,
  default_number_id uuid,
  routing_strategy text NOT NULL DEFAULT 'least_loaded',
  max_wait_seconds integer NOT NULL DEFAULT 120,
  max_queue_size integer,
  overflow_action text NOT NULL DEFAULT 'voicemail_or_callback',
  business_hours_id uuid REFERENCES public.voice_business_hours(id) ON DELETE SET NULL,
  sla_policy_id uuid REFERENCES public.voice_sla_policies(id) ON DELETE SET NULL,
  recording_enabled boolean NOT NULL DEFAULT false,
  transcription_enabled boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vq_workspace ON public.voice_queues(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_queue_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  queue_id uuid NOT NULL REFERENCES public.voice_queues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  skill_tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  max_concurrent_calls integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (queue_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_vqm_workspace ON public.voice_queue_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vqm_queue ON public.voice_queue_members(queue_id);

CREATE TABLE IF NOT EXISTS public.voice_ivr_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  greeting_text text,
  greeting_audio_url text,
  language text NOT NULL DEFAULT 'pt-PT',
  timeout_seconds integer NOT NULL DEFAULT 5,
  max_retries integer NOT NULL DEFAULT 2,
  fallback_action text NOT NULL DEFAULT 'queue',
  fallback_queue_id uuid REFERENCES public.voice_queues(id) ON DELETE SET NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ivr_workspace ON public.voice_ivr_menus(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_ivr_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  ivr_menu_id uuid NOT NULL REFERENCES public.voice_ivr_menus(id) ON DELETE CASCADE,
  digit text NOT NULL,
  label text NOT NULL,
  action_type text NOT NULL,
  target_queue_id uuid REFERENCES public.voice_queues(id) ON DELETE SET NULL,
  target_user_id uuid,
  target_number text,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ivr_menu_id, digit)
);
CREATE INDEX IF NOT EXISTS idx_ivro_workspace ON public.voice_ivr_options(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  trigger_type text NOT NULL DEFAULT 'inbound_call',
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_instance_id uuid,
  voice_number_id uuid,
  last_executed_at timestamptz,
  execution_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vrr_workspace ON public.voice_routing_rules(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  call_log_id uuid REFERENCES public.voice_call_logs(id) ON DELETE SET NULL,
  contact_id uuid,
  lead_id uuid,
  ticket_id uuid,
  deal_id uuid,
  queue_id uuid REFERENCES public.voice_queues(id) ON DELETE SET NULL,
  assigned_to uuid,
  phone text NOT NULL,
  normalized_phone text NOT NULL,
  preferred_time timestamptz,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  reason text,
  source text NOT NULL DEFAULT 'missed_call',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vcb_workspace ON public.voice_callback_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vcb_status ON public.voice_callback_requests(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_vcb_due ON public.voice_callback_requests(workspace_id, due_at);

CREATE TABLE IF NOT EXISTS public.voice_agent_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offline',
  active_call_id uuid REFERENCES public.voice_call_logs(id) ON DELETE SET NULL,
  current_queue_id uuid REFERENCES public.voice_queues(id) ON DELETE SET NULL,
  max_concurrent_calls integer NOT NULL DEFAULT 1,
  last_status_change_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_vas_workspace ON public.voice_agent_status(workspace_id);

CREATE TABLE IF NOT EXISTS public.voice_queue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  queue_id uuid REFERENCES public.voice_queues(id) ON DELETE SET NULL,
  call_log_id uuid REFERENCES public.voice_call_logs(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vqe_workspace ON public.voice_queue_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vqe_queue ON public.voice_queue_events(queue_id);
CREATE INDEX IF NOT EXISTS idx_vqe_call ON public.voice_queue_events(call_log_id);

ALTER TABLE public.voice_call_logs
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.voice_queues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ivr_menu_id uuid REFERENCES public.voice_ivr_menus(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ivr_selection text,
  ADD COLUMN IF NOT EXISTS routing_rule_id uuid REFERENCES public.voice_routing_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS missed_reason text,
  ADD COLUMN IF NOT EXISTS callback_request_id uuid REFERENCES public.voice_callback_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queue_entered_at timestamptz,
  ADD COLUMN IF NOT EXISTS queue_answered_at timestamptz,
  ADD COLUMN IF NOT EXISTS queue_abandoned_at timestamptz,
  ADD COLUMN IF NOT EXISTS wait_seconds integer,
  ADD COLUMN IF NOT EXISTS agent_status_at_call text,
  ADD COLUMN IF NOT EXISTS overflow_action_taken text;

CREATE OR REPLACE FUNCTION public.voice_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'voice_business_hours','voice_sla_policies','voice_queues','voice_queue_members',
    'voice_ivr_menus','voice_ivr_options','voice_routing_rules','voice_callback_requests',
    'voice_agent_status'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s
      FOR EACH ROW EXECUTE FUNCTION public.voice_set_updated_at()', t);
  END LOOP;
END $$;

ALTER TABLE public.voice_business_hours    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sla_policies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_queues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_queue_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ivr_menus         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ivr_options       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_routing_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agent_status      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_queue_events      ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'voice_business_hours','voice_sla_policies','voice_queues','voice_queue_members',
    'voice_ivr_menus','voice_ivr_options','voice_routing_rules','voice_callback_requests',
    'voice_agent_status'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "members_full" ON public.%1$s', t);
    EXECUTE format($p$CREATE POLICY "members_full" ON public.%1$s
      FOR ALL TO authenticated
      USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))$p$, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "members_read_events" ON public.voice_queue_events;
CREATE POLICY "members_read_events" ON public.voice_queue_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "service_write_events" ON public.voice_queue_events;
CREATE POLICY "service_write_events" ON public.voice_queue_events
  FOR INSERT TO service_role WITH CHECK (true);
