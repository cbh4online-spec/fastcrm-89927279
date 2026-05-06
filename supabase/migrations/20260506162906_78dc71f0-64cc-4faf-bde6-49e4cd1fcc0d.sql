-- ============================================
-- FASE 1J — Smart Workflows / Automation Rules
-- ============================================

ALTER TABLE public.journey_automations
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS trigger_event text,
  ADD COLUMN IF NOT EXISTS conditions_logic text DEFAULT 'all' CHECK (conditions_logic IN ('all','any')),
  ADD COLUMN IF NOT EXISTS cooldown_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_runs_per_day integer,
  ADD COLUMN IF NOT EXISTS max_runs_per_entity_per_day integer,
  ADD COLUMN IF NOT EXISTS require_human_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS run_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_journey_automations_trigger_event
  ON public.journey_automations(workspace_id, trigger_event)
  WHERE is_active = true AND trigger_event IS NOT NULL;

ALTER TABLE public.journey_automation_logs
  DROP CONSTRAINT IF EXISTS journey_automation_logs_entity_type_check,
  DROP CONSTRAINT IF EXISTS journey_automation_logs_status_check;

ALTER TABLE public.journey_automation_logs
  ADD COLUMN IF NOT EXISTS rule_id uuid,
  ADD COLUMN IF NOT EXISTS conditions_result jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS depth integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS triggered_by_rule_id uuid,
  ADD COLUMN IF NOT EXISTS automation_context_id uuid,
  ADD COLUMN IF NOT EXISTS dry_run boolean DEFAULT false;

ALTER TABLE public.journey_automation_logs
  ADD CONSTRAINT journey_automation_logs_status_check
  CHECK (status IN ('success','failed','partial','pending','running','completed','skipped','approval_required'));

ALTER TABLE public.journey_automation_logs
  ALTER COLUMN entity_name DROP NOT NULL,
  ALTER COLUMN automation_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journey_automation_logs_rule
  ON public.journey_automation_logs(rule_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_journey_automation_logs_context
  ON public.journey_automation_logs(automation_context_id)
  WHERE automation_context_id IS NOT NULL;

-- automation_action_approvals
CREATE TABLE IF NOT EXISTS public.automation_action_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_run_id uuid REFERENCES public.journey_automation_logs(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.journey_automations(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  proposed_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  requested_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  execution_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_approvals_workspace_status
  ON public.automation_action_approvals(workspace_id, status, created_at DESC);

ALTER TABLE public.automation_action_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view approvals"
  ON public.automation_action_approvals FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "admins can manage approvals"
  ON public.automation_action_approvals FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('owner','admin')
    )
  );

CREATE TRIGGER trg_automation_approvals_updated
  BEFORE UPDATE ON public.automation_action_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- automation_templates
CREATE TABLE IF NOT EXISTS public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  trigger_event text NOT NULL,
  conditions_logic text DEFAULT 'all',
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  enabled_by_default boolean DEFAULT false,
  system_template boolean DEFAULT false,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_templates_category
  ON public.automation_templates(category) WHERE system_template = true;

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view system or workspace templates"
  ON public.automation_templates FOR SELECT
  TO authenticated
  USING (
    system_template = true
    OR (workspace_id IS NOT NULL AND is_workspace_member(auth.uid(), workspace_id))
  );

CREATE POLICY "admins manage workspace templates"
  ON public.automation_templates FOR ALL
  USING (
    workspace_id IS NOT NULL AND workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    workspace_id IS NOT NULL AND workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner','admin')
    )
  );

CREATE TRIGGER trg_automation_templates_updated
  BEFORE UPDATE ON public.automation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed templates (8 PT-PT)
INSERT INTO public.automation_templates (name, description, category, trigger_event, conditions, actions, system_template, icon) VALUES
  ('Conversa urgente sem responsável','Quando uma conversa urgente é detectada e ainda não tem agente atribuído, alerta o gestor.','whatsapp','whatsapp.conversation.urgent_detected',
   '[{"field":"assigned_to","operator":"is_empty","value":null}]'::jsonb,
   '[{"action_type":"create_operational_alert","config":{"severity":"high","title":"Conversa urgente sem responsável"}},{"action_type":"notify_manager","config":{"message":"Conversa urgente requer atribuição imediata"}},{"action_type":"add_conversation_tag","config":{"tag":"urgente"}}]'::jsonb,
   true,'AlertTriangle'),
  ('Pedido de suporte detectado','Cria automaticamente um ticket quando a IA classifica a conversa como pedido de suporte.','support','whatsapp.conversation.analyzed',
   '[{"field":"intent","operator":"equals","value":"support_request"}]'::jsonb,
   '[{"action_type":"create_ticket","config":{"priority":"medium","category":"support"}},{"action_type":"add_conversation_tag","config":{"tag":"suporte"}}]'::jsonb,
   true,'Ticket'),
  ('Reclamação crítica','Reclamações com urgência alta criam ticket crítico e notificam o gestor.','support','whatsapp.conversation.analyzed',
   '[{"field":"intent","operator":"equals","value":"complaint"},{"field":"urgency","operator":"in","value":["high","critical"]}]'::jsonb,
   '[{"action_type":"create_ticket","config":{"priority":"critical"}},{"action_type":"notify_manager","config":{}},{"action_type":"create_operational_alert","config":{"severity":"critical"}}]'::jsonb,
   true,'AlertOctagon'),
  ('Follow-up vencido','Quando um follow-up passa do prazo, notifica o utilizador responsável.','followup','communication.followup.overdue',
   '[]'::jsonb,
   '[{"action_type":"notify_user","config":{"message":"Tem um follow-up vencido"}},{"action_type":"create_operational_alert","config":{"severity":"medium"}}]'::jsonb,
   true,'Clock'),
  ('Ticket SLA em risco','Tickets prestes a violar o SLA notificam o gestor e adicionam nota interna.','support','support.ticket.sla_risk',
   '[]'::jsonb,
   '[{"action_type":"notify_manager","config":{}},{"action_type":"add_internal_note","config":{"note":"SLA em risco — ação necessária"}}]'::jsonb,
   true,'Timer'),
  ('Áudio recebido — transcrever','Áudios recebidos são automaticamente transcritos para análise.','whatsapp','whatsapp.audio.received',
   '[]'::jsonb,
   '[{"action_type":"trigger_audio_transcription","config":{}}]'::jsonb,
   true,'Mic'),
  ('Objeção detectada','Quando uma objeção é detectada, marca a conversa e dispara revisão de qualidade.','quality','whatsapp.conversation.objection_detected',
   '[]'::jsonb,
   '[{"action_type":"trigger_quality_review","config":{}},{"action_type":"add_conversation_tag","config":{"tag":"objeção"}}]'::jsonb,
   true,'Shield'),
  ('Conversa sem resposta há 30 minutos','Conversas sem resposta há mais de 30 min disparam alerta operacional.','team','communication.conversation.unanswered',
   '[{"field":"no_response_minutes","operator":"greater_than","value":30}]'::jsonb,
   '[{"action_type":"notify_user","config":{}},{"action_type":"create_operational_alert","config":{"severity":"medium"}}]'::jsonb,
   true,'Hourglass')
ON CONFLICT DO NOTHING;

-- Trigger: dispatch automation on communication event
CREATE OR REPLACE FUNCTION public.dispatch_automation_on_communication_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_rule boolean;
BEGIN
  IF (NEW.payload ? 'source' AND NEW.payload->>'source' = 'automation') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journey_automations
    WHERE workspace_id = NEW.workspace_id
      AND is_active = true
      AND trigger_event = NEW.event_type
  ) INTO v_has_rule;

  IF NOT v_has_rule THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/automation-execute-rule',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8'
    ),
    body := jsonb_build_object(
      'workspace_id',NEW.workspace_id,
      'event_type',NEW.event_type,
      'entity_type',NEW.entity_type,
      'entity_id',NEW.entity_id,
      'conversation_id',NEW.conversation_id,
      'contact_id',NEW.contact_id,
      'event_id',NEW.id,
      'payload',NEW.payload
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_automation_on_wce ON public.whatsapp_communication_events;
CREATE TRIGGER trg_dispatch_automation_on_wce
  AFTER INSERT ON public.whatsapp_communication_events
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_automation_on_communication_event();