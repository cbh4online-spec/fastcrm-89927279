-- ============================================================
-- FASE 1F — Agendamentos, Lembretes WhatsApp e Follow-up
-- ============================================================

-- 1) Estender calendar_events com campos de "appointment WhatsApp"
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS appointment_type text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Lisbon',
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reminder_settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Permitir novos estados para appointments (rescheduled, no_show, completed)
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_status_check;
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_status_check
  CHECK (status = ANY (ARRAY['tentative','confirmed','cancelled','scheduled','completed','no_show','rescheduled']));

CREATE INDEX IF NOT EXISTS idx_calendar_events_conversation
  ON public.calendar_events(conversation_id) WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to
  ON public.calendar_events(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_appointment_type
  ON public.calendar_events(workspace_id, appointment_type)
  WHERE appointment_type IS NOT NULL;

-- 2) Estender conversation_followups com campos da Fase 1F
ALTER TABLE public.conversation_followups
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS due_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS deal_id uuid,
  ADD COLUMN IF NOT EXISTS suggested_by_ai boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Estender check de status para incluir os estados novos
ALTER TABLE public.conversation_followups DROP CONSTRAINT IF EXISTS conversation_followups_status_check;
ALTER TABLE public.conversation_followups
  ADD CONSTRAINT conversation_followups_status_check
  CHECK (status = ANY (ARRAY['pending','snoozed','sent','dismissed','approved','open','in_progress','completed','cancelled','overdue']));

ALTER TABLE public.conversation_followups
  ADD CONSTRAINT conversation_followups_priority_check
  CHECK (priority = ANY (ARRAY['low','medium','high','urgent']));

ALTER TABLE public.conversation_followups
  ADD CONSTRAINT conversation_followups_source_check
  CHECK (source = ANY (ARRAY['manual','inbox_intelligence','post_appointment','no_response','product_share','proposal_sent','ai_policy']));

-- conversation_id passa a ser nullable (follow-up pode existir sem conversa, ex.: post_appointment)
ALTER TABLE public.conversation_followups ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE public.conversation_followups ALTER COLUMN hours_since_last_reply DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_followups_due
  ON public.conversation_followups(workspace_id, due_at)
  WHERE due_at IS NOT NULL AND status IN ('open','pending','in_progress');

CREATE INDEX IF NOT EXISTS idx_conversation_followups_assigned_to
  ON public.conversation_followups(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_followups_appointment
  ON public.conversation_followups(appointment_id) WHERE appointment_id IS NOT NULL;

-- 3) Tabela nova: whatsapp_scheduled_reminders
CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  contact_id uuid,
  channel text NOT NULL DEFAULT 'whatsapp',
  reminder_type text NOT NULL,
  template_id uuid,
  message_content text NOT NULL,
  to_phone text,
  due_at timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  provider_message_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_scheduled_reminders_status_check
    CHECK (status = ANY (ARRAY['scheduled','pending','sent','failed','cancelled','skipped'])),
  CONSTRAINT whatsapp_scheduled_reminders_type_check
    CHECK (reminder_type = ANY (ARRAY['confirmation','reminder_24h','reminder_2h','reminder_1h','reminder_15m','followup_after','no_response_followup'])),
  CONSTRAINT whatsapp_scheduled_reminders_channel_check
    CHECK (channel = ANY (ARRAY['whatsapp','sms','email']))
);

CREATE INDEX IF NOT EXISTS idx_wsr_workspace ON public.whatsapp_scheduled_reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wsr_due ON public.whatsapp_scheduled_reminders(status, due_at)
  WHERE status IN ('scheduled','pending');
CREATE INDEX IF NOT EXISTS idx_wsr_appointment ON public.whatsapp_scheduled_reminders(appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wsr_conversation ON public.whatsapp_scheduled_reminders(conversation_id)
  WHERE conversation_id IS NOT NULL;

ALTER TABLE public.whatsapp_scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wsr_select_members" ON public.whatsapp_scheduled_reminders
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "wsr_insert_members" ON public.whatsapp_scheduled_reminders
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "wsr_update_members" ON public.whatsapp_scheduled_reminders
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "wsr_delete_members" ON public.whatsapp_scheduled_reminders
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_wsr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wsr_updated_at ON public.whatsapp_scheduled_reminders;
CREATE TRIGGER trg_wsr_updated_at
BEFORE UPDATE ON public.whatsapp_scheduled_reminders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_wsr();

-- 4) Configurações de workspace para Fase 1F
ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS whatsapp_pro_default_timezone text DEFAULT 'Europe/Lisbon',
  ADD COLUMN IF NOT EXISTS whatsapp_pro_default_duration_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS whatsapp_pro_default_reminders jsonb DEFAULT '["reminder_24h","reminder_1h"]'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_pro_auto_send_confirmation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_pro_auto_create_followup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_pro_default_reminder_channel text DEFAULT 'whatsapp';

-- 5) Função utilitária para emitir eventos de comunicação (idempotente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='communication_events'
  ) THEN
    -- Tabela existe; criamos wrapper apenas se ainda não existir a função
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname='emit_communication_event'
    ) THEN
      EXECUTE $f$
        CREATE FUNCTION public.emit_communication_event(
          _workspace_id uuid,
          _event_type text,
          _payload jsonb DEFAULT '{}'::jsonb
        ) RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $body$
        DECLARE
          new_id uuid;
        BEGIN
          INSERT INTO public.communication_events(workspace_id, event_type, payload, created_at)
          VALUES (_workspace_id, _event_type, _payload, now())
          RETURNING id INTO new_id;
          RETURN new_id;
        EXCEPTION WHEN OTHERS THEN
          RETURN NULL;
        END;
        $body$;
      $f$;
    END IF;
  END IF;
END$$;

-- 6) Seed de templates WhatsApp para Fase 1F
-- Insere em communication_templates + whatsapp_templates_meta para cada workspace que ainda não tenha
DO $$
DECLARE
  ws RECORD;
  v_template_id uuid;
  v_owner uuid;
  has_communication_templates boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='communication_templates'
  ) INTO has_communication_templates;

  IF NOT has_communication_templates THEN
    RETURN;
  END IF;

  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- Confirmação de agendamento
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_templates ct
      JOIN public.whatsapp_templates_meta m ON m.template_id = ct.id
      WHERE m.workspace_id = ws.id AND m.category = 'appointment' AND ct.name = 'Confirmação de agendamento'
    ) THEN
      SELECT user_id INTO v_owner FROM public.workspace_members
        WHERE workspace_id = ws.id ORDER BY created_at ASC LIMIT 1;

      INSERT INTO public.communication_templates(workspace_id, name, channel, body, created_by)
      VALUES (
        ws.id,
        'Confirmação de agendamento',
        'whatsapp',
        E'Olá {{contact_name}}, fica confirmado o nosso agendamento:\n\n{{appointment_title}}\n\nData: {{appointment_date}}\nHora: {{appointment_time}}\nDuração prevista: {{appointment_duration}}\n\n{{appointment_location_or_link}}\n\nAté breve.',
        v_owner
      ) RETURNING id INTO v_template_id;

      INSERT INTO public.whatsapp_templates_meta(template_id, workspace_id, category, country, suggested_variables)
      VALUES (v_template_id, ws.id, 'appointment', 'PT',
        '["contact_name","appointment_title","appointment_date","appointment_time","appointment_duration","appointment_location_or_link"]'::jsonb);
    END IF;

    -- Lembrete 24h
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_templates ct
      JOIN public.whatsapp_templates_meta m ON m.template_id = ct.id
      WHERE m.workspace_id = ws.id AND m.category = 'appointment' AND ct.name = 'Lembrete de agendamento — 24h'
    ) THEN
      SELECT user_id INTO v_owner FROM public.workspace_members
        WHERE workspace_id = ws.id ORDER BY created_at ASC LIMIT 1;

      INSERT INTO public.communication_templates(workspace_id, name, channel, body, created_by)
      VALUES (
        ws.id,
        'Lembrete de agendamento — 24h',
        'whatsapp',
        E'Olá {{contact_name}}, lembramos do nosso agendamento amanhã:\n\n{{appointment_title}}\nData: {{appointment_date}} às {{appointment_time}}\n\n{{appointment_location_or_link}}\n\nSe precisar de reagendar, basta responder a esta mensagem.',
        v_owner
      ) RETURNING id INTO v_template_id;

      INSERT INTO public.whatsapp_templates_meta(template_id, workspace_id, category, country, suggested_variables)
      VALUES (v_template_id, ws.id, 'appointment', 'PT',
        '["contact_name","appointment_title","appointment_date","appointment_time","appointment_location_or_link"]'::jsonb);
    END IF;

    -- Lembrete 1h
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_templates ct
      JOIN public.whatsapp_templates_meta m ON m.template_id = ct.id
      WHERE m.workspace_id = ws.id AND m.category = 'appointment' AND ct.name = 'Lembrete de agendamento — 1h'
    ) THEN
      SELECT user_id INTO v_owner FROM public.workspace_members
        WHERE workspace_id = ws.id ORDER BY created_at ASC LIMIT 1;

      INSERT INTO public.communication_templates(workspace_id, name, channel, body, created_by)
      VALUES (
        ws.id,
        'Lembrete de agendamento — 1h',
        'whatsapp',
        E'Olá {{contact_name}}, faltam cerca de 1 hora para o nosso {{appointment_title}}.\n\n{{appointment_location_or_link}}\n\nAté já.',
        v_owner
      ) RETURNING id INTO v_template_id;

      INSERT INTO public.whatsapp_templates_meta(template_id, workspace_id, category, country, suggested_variables)
      VALUES (v_template_id, ws.id, 'appointment', 'PT',
        '["contact_name","appointment_title","appointment_location_or_link"]'::jsonb);
    END IF;

    -- Follow-up pós-interação
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_templates ct
      JOIN public.whatsapp_templates_meta m ON m.template_id = ct.id
      WHERE m.workspace_id = ws.id AND m.category = 'followup' AND ct.name = 'Follow-up pós-interação'
    ) THEN
      SELECT user_id INTO v_owner FROM public.workspace_members
        WHERE workspace_id = ws.id ORDER BY created_at ASC LIMIT 1;

      INSERT INTO public.communication_templates(workspace_id, name, channel, body, created_by)
      VALUES (
        ws.id,
        'Follow-up pós-interação',
        'whatsapp',
        E'Olá {{contact_name}}, obrigado pelo seu tempo.\n\nFica aqui o resumo do que falámos:\n{{interaction_summary}}\n\nPróximo passo:\n{{next_step}}\n\nQualquer questão, estou disponível.',
        v_owner
      ) RETURNING id INTO v_template_id;

      INSERT INTO public.whatsapp_templates_meta(template_id, workspace_id, category, country, suggested_variables)
      VALUES (v_template_id, ws.id, 'followup', 'PT',
        '["contact_name","interaction_summary","next_step"]'::jsonb);
    END IF;

    -- Follow-up sem resposta
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_templates ct
      JOIN public.whatsapp_templates_meta m ON m.template_id = ct.id
      WHERE m.workspace_id = ws.id AND m.category = 'followup' AND ct.name = 'Follow-up sem resposta'
    ) THEN
      SELECT user_id INTO v_owner FROM public.workspace_members
        WHERE workspace_id = ws.id ORDER BY created_at ASC LIMIT 1;

      INSERT INTO public.communication_templates(workspace_id, name, channel, body, created_by)
      VALUES (
        ws.id,
        'Follow-up sem resposta',
        'whatsapp',
        E'Olá {{contact_name}}, estou só a retomar a nossa conversa.\n\nFicou alguma dúvida da sua parte ou prefere que lhe envie uma sugestão mais objetiva para avançarmos?',
        v_owner
      ) RETURNING id INTO v_template_id;

      INSERT INTO public.whatsapp_templates_meta(template_id, workspace_id, category, country, suggested_variables)
      VALUES (v_template_id, ws.id, 'followup', 'PT',
        '["contact_name"]'::jsonb);
    END IF;
  END LOOP;
END$$;

-- 7) Comentários
COMMENT ON COLUMN public.calendar_events.appointment_type IS 'Fase 1F: phone_call, whatsapp_call, whatsapp_video_call, online_meeting, in_person_meeting, demo, consultation, support, sales_followup, proposal_review, other';
COMMENT ON COLUMN public.calendar_events.conversation_id IS 'Fase 1F: conversa WhatsApp/Inbox que originou o agendamento';
COMMENT ON COLUMN public.conversation_followups.source IS 'Fase 1F: manual | inbox_intelligence | post_appointment | no_response | product_share | proposal_sent | ai_policy';
COMMENT ON TABLE public.whatsapp_scheduled_reminders IS 'Fase 1F: fila de lembretes WhatsApp programados para agendamentos';