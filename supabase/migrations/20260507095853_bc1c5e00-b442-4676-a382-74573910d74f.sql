
-- =========================================================================
-- FASE 2A — FASTCRM KERNEL CONSOLIDATION
-- =========================================================================

-- ---------- 0. Helper: updated_at trigger reuse public.update_updated_at_column ----------

-- ---------- 1. EXPAND kernel_events ----------
ALTER TABLE public.kernel_events
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS parent_entity_kind text,
  ADD COLUMN IF NOT EXISTS parent_entity_id text,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_contact_id uuid,
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info';

CREATE INDEX IF NOT EXISTS idx_kernel_events_category ON public.kernel_events(workspace_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kernel_events_domain ON public.kernel_events(workspace_id, domain, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kernel_events_correlation ON public.kernel_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kernel_events_status ON public.kernel_events(workspace_id, status) WHERE status <> 'processed';
CREATE INDEX IF NOT EXISTS idx_kernel_events_source_table ON public.kernel_events(source_table, source_id) WHERE source_table IS NOT NULL;

-- ---------- 2. EVENT REGISTRY (expanded) ----------
CREATE TABLE IF NOT EXISTS public.kernel_event_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text UNIQUE NOT NULL,
  category text NOT NULL,
  domain text NOT NULL,
  entity_type text,
  description text,
  status text NOT NULL DEFAULT 'active',
  severity_default text NOT NULL DEFAULT 'info',
  source_module text,
  payload_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_fields text[] NOT NULL DEFAULT '{}'::text[],
  optional_fields text[] NOT NULL DEFAULT '{}'::text[],
  produces_timeline_event boolean NOT NULL DEFAULT true,
  triggers_workflows boolean NOT NULL DEFAULT true,
  affects_metrics boolean NOT NULL DEFAULT true,
  affects_context_graph boolean NOT NULL DEFAULT true,
  retention_days integer,
  pii_level text NOT NULL DEFAULT 'low',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_event_registry_category ON public.kernel_event_registry(category);
CREATE INDEX IF NOT EXISTS idx_kernel_event_registry_domain ON public.kernel_event_registry(domain);
CREATE INDEX IF NOT EXISTS idx_kernel_event_registry_status ON public.kernel_event_registry(status);

ALTER TABLE public.kernel_event_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kernel_event_registry_read ON public.kernel_event_registry;
CREATE POLICY kernel_event_registry_read ON public.kernel_event_registry
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_kernel_event_registry_updated
  BEFORE UPDATE ON public.kernel_event_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. EVENT RELATIONSHIPS ----------
CREATE TABLE IF NOT EXISTS public.kernel_event_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.kernel_events(id) ON DELETE CASCADE,
  related_event_id uuid NOT NULL REFERENCES public.kernel_events(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_event_rel_event ON public.kernel_event_relationships(event_id);
CREATE INDEX IF NOT EXISTS idx_kernel_event_rel_related ON public.kernel_event_relationships(related_event_id);

ALTER TABLE public.kernel_event_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_event_rel_select ON public.kernel_event_relationships
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ---------- 4. ENTITY REGISTRY ----------
CREATE TABLE IF NOT EXISTS public.kernel_entity_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text UNIQUE NOT NULL,
  display_name text NOT NULL,
  module text NOT NULL,
  table_name text,
  primary_key_field text NOT NULL DEFAULT 'id',
  workspace_field text NOT NULL DEFAULT 'workspace_id',
  description text,
  timeline_enabled boolean NOT NULL DEFAULT true,
  context_graph_enabled boolean NOT NULL DEFAULT true,
  change_impact_enabled boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_entity_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_entity_registry_read ON public.kernel_entity_registry
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_kernel_entity_registry_updated
  BEFORE UPDATE ON public.kernel_entity_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 5. CONTEXT GRAPH ----------
CREATE TABLE IF NOT EXISTS public.kernel_context_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  label text,
  status text,
  importance_score numeric,
  last_event_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_kernel_context_nodes_entity ON public.kernel_context_nodes(workspace_id, entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.kernel_context_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_entity_type text NOT NULL,
  from_entity_id uuid NOT NULL,
  to_entity_type text NOT NULL,
  to_entity_id uuid NOT NULL,
  relationship_type text NOT NULL,
  strength numeric NOT NULL DEFAULT 1,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_context_edges_from ON public.kernel_context_edges(workspace_id, from_entity_type, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_kernel_context_edges_to ON public.kernel_context_edges(workspace_id, to_entity_type, to_entity_id);

ALTER TABLE public.kernel_context_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_context_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_context_nodes_select ON public.kernel_context_nodes
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY kernel_context_edges_select ON public.kernel_context_edges
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE TRIGGER trg_kernel_context_nodes_updated BEFORE UPDATE ON public.kernel_context_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kernel_context_edges_updated BEFORE UPDATE ON public.kernel_context_edges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6. UNIFIED ENTITY TIMELINE ----------
CREATE TABLE IF NOT EXISTS public.kernel_entity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_id uuid REFERENCES public.kernel_events(id) ON DELETE SET NULL,
  timeline_type text NOT NULL DEFAULT 'event',
  title text NOT NULL,
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_contact_id uuid,
  source_module text,
  icon text,
  color text,
  visible_to_customer boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_timeline_entity ON public.kernel_entity_timeline(workspace_id, entity_type, entity_id, occurred_at DESC);
ALTER TABLE public.kernel_entity_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_timeline_select ON public.kernel_entity_timeline
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ---------- 7. DECISION ENGINE ----------
CREATE TABLE IF NOT EXISTS public.kernel_decision_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_event_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_type text NOT NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  safeguards jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_decision_rules_trigger ON public.kernel_decision_rules(trigger_event_type) WHERE active;
ALTER TABLE public.kernel_decision_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_decision_rules_select ON public.kernel_decision_rules
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE TRIGGER trg_kernel_decision_rules_updated BEFORE UPDATE ON public.kernel_decision_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend kernel_decisions
ALTER TABLE public.kernel_decisions
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.kernel_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.kernel_decision_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS recommended_action jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS executed_action jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_source text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS requires_human_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approval_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_kernel_decisions_event ON public.kernel_decisions(event_id);
CREATE INDEX IF NOT EXISTS idx_kernel_decisions_rule ON public.kernel_decisions(rule_id);

-- ---------- 8. CHANGE IMPACT MAP ----------
CREATE TABLE IF NOT EXISTS public.kernel_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  changed_entity_type text NOT NULL,
  changed_entity_id uuid NOT NULL,
  change_type text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_change_events_entity ON public.kernel_change_events(workspace_id, changed_entity_type, changed_entity_id);

CREATE TABLE IF NOT EXISTS public.kernel_change_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_event_id uuid NOT NULL REFERENCES public.kernel_change_events(id) ON DELETE CASCADE,
  impacted_entity_type text NOT NULL,
  impacted_entity_id uuid,
  impact_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_kernel_change_impacts_status ON public.kernel_change_impacts(workspace_id, status, severity);

ALTER TABLE public.kernel_change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_change_impacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_change_events_select ON public.kernel_change_events
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY kernel_change_impacts_all ON public.kernel_change_impacts
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE TRIGGER trg_kernel_change_impacts_updated BEFORE UPDATE ON public.kernel_change_impacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 9. ENTITY DEPENDENCIES ----------
CREATE TABLE IF NOT EXISTS public.kernel_entity_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_entity_type text NOT NULL,
  source_entity_id uuid NOT NULL,
  depends_on_entity_type text NOT NULL,
  depends_on_entity_id uuid,
  dependency_type text NOT NULL,
  criticality text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_dep_source ON public.kernel_entity_dependencies(workspace_id, source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_kernel_dep_target ON public.kernel_entity_dependencies(workspace_id, depends_on_entity_type, depends_on_entity_id);
ALTER TABLE public.kernel_entity_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_dep_select ON public.kernel_entity_dependencies
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ---------- 10. AUDIT LOGS ----------
CREATE TABLE IF NOT EXISTS public.kernel_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  event_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kernel_audit_ws ON public.kernel_audit_logs(workspace_id, created_at DESC);
ALTER TABLE public.kernel_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_audit_select ON public.kernel_audit_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ---------- 11. RETENTION POLICIES ----------
CREATE TABLE IF NOT EXISTS public.kernel_event_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text,
  event_type text,
  retention_days integer NOT NULL,
  archive_enabled boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_event_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY kernel_retention_select ON public.kernel_event_retention_policies
  FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE TRIGGER trg_kernel_retention_updated BEFORE UPDATE ON public.kernel_event_retention_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 12. PAYLOAD SANITIZATION FUNCTION ----------
CREATE OR REPLACE FUNCTION public.kernel_sanitize_payload(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  k text;
  result jsonb := COALESCE(p_payload, '{}'::jsonb);
  sensitive text[] := ARRAY['api_key','apikey','token','access_token','refresh_token','secret','password','authorization','auth','cookies','cookie','credit_card','card_number','cvv','ssn','private_key'];
BEGIN
  IF jsonb_typeof(result) <> 'object' THEN
    RETURN result;
  END IF;
  FOREACH k IN ARRAY sensitive LOOP
    IF result ? k THEN
      result := result || jsonb_build_object(k, '***REDACTED***');
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- ---------- 13. EMIT FUNCTION ----------
CREATE OR REPLACE FUNCTION public.kernel_emit_event(
  p_workspace_id uuid,
  p_event_type text,
  p_entity_kind text,
  p_entity_id text,
  p_actor_type text DEFAULT 'system',
  p_actor_id text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_source_module text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_causation_id text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_registry record;
BEGIN
  SELECT category, domain, severity_default
    INTO v_registry
  FROM public.kernel_event_registry
  WHERE event_type = p_event_type AND status = 'active';

  INSERT INTO public.kernel_events (
    workspace_id, type, event_name, entity_kind, entity_id,
    actor_type, actor_id, payload, source_module, source_table, source_id,
    correlation_id, causation_id, idempotency_key,
    category, domain, severity, occurred_at
  ) VALUES (
    p_workspace_id, p_event_type, p_event_type, p_entity_kind, p_entity_id,
    p_actor_type, p_actor_id, public.kernel_sanitize_payload(p_payload),
    p_source_module, p_source_table, p_source_id,
    p_correlation_id, p_causation_id, p_idempotency_key,
    COALESCE(v_registry.category, 'uncategorized'),
    COALESCE(v_registry.domain, split_part(p_event_type, '.', 1)),
    COALESCE(v_registry.severity_default, 'info'),
    now()
  )
  ON CONFLICT (workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ---------- 14. BRIDGE TRIGGERS (legacy → kernel) ----------

-- Generic trigger functions per source table

CREATE OR REPLACE FUNCTION public.kernel_bridge_whatsapp_communication_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'whatsapp.' || NEW.event_type,
    COALESCE(NEW.entity_type, 'whatsapp_message'),
    COALESCE(NEW.entity_id::text, NEW.id::text),
    'system', NEW.created_by::text,
    NEW.payload, 'whatsapp', 'whatsapp_communication_events', NEW.id, NULL, NULL,
    'wa_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_support_ticket_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'support.ticket.' || NEW.event_type,
    'support_ticket', NEW.ticket_id::text,
    'system', NEW.created_by::text,
    NEW.payload, 'support', 'support_ticket_events', NEW.id, NULL, NULL,
    'sup_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_voice_queue_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'voice.queue.' || NEW.event_type,
    'voice_queue', NEW.queue_id::text,
    'system', NEW.user_id::text,
    NEW.payload, 'voice', 'voice_queue_events', NEW.id, NULL, NULL,
    'voq_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_customer_onboarding_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'onboarding.' || NEW.event_type,
    'onboarding_project', NEW.onboarding_project_id::text,
    'system', NEW.user_id::text,
    NEW.payload, 'onboarding', 'customer_onboarding_events', NEW.id, NULL, NULL,
    'onb_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_implementation_project_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'implementation.' || NEW.event_type,
    'implementation_project', NEW.project_id::text,
    'system', NEW.user_id::text,
    NEW.payload, 'implementation', 'implementation_project_events', NEW.id, NULL, NULL,
    'imp_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_usage_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'cost_guard.usage.' || NEW.event_type,
    COALESCE(NEW.resource_type, 'usage_event'),
    COALESCE(NEW.resource_id::text, NEW.id::text),
    'system', NEW.user_id::text,
    COALESCE(NEW.metadata,'{}'::jsonb) || jsonb_build_object('quantity', NEW.quantity),
    'cost_guard', 'usage_events', NEW.id, NULL, NULL,
    'use_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_executive_recommendations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'executive.recommendation.created',
    'executive_recommendation', NEW.id::text,
    'system', NULL,
    jsonb_build_object('title', NEW.title, 'type', NEW.recommendation_type, 'priority', NEW.priority, 'confidence', NEW.confidence),
    'executive', 'executive_recommendations', NEW.id, NULL, NULL,
    'exr_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.kernel_bridge_customer_success_signals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.kernel_emit_event(
    NEW.workspace_id,
    'customer.signal.' || COALESCE(NEW.signal_type, 'detected'),
    'customer_account', NEW.customer_account_id::text,
    'system', NULL,
    COALESCE(NEW.metadata,'{}'::jsonb) || jsonb_build_object('signal', NEW.signal_type, 'category', NEW.signal_category, 'severity', NEW.severity, 'title', NEW.title),
    'customer_success', 'customer_success_signals', NEW.id, NULL, NULL,
    'css_ev_' || NEW.id::text
  );
  RETURN NEW;
END; $$;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_bridge_whatsapp_communication_events ON public.whatsapp_communication_events;
CREATE TRIGGER trg_bridge_whatsapp_communication_events AFTER INSERT ON public.whatsapp_communication_events
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_whatsapp_communication_events();

DROP TRIGGER IF EXISTS trg_bridge_support_ticket_events ON public.support_ticket_events;
CREATE TRIGGER trg_bridge_support_ticket_events AFTER INSERT ON public.support_ticket_events
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_support_ticket_events();

DROP TRIGGER IF EXISTS trg_bridge_voice_queue_events ON public.voice_queue_events;
CREATE TRIGGER trg_bridge_voice_queue_events AFTER INSERT ON public.voice_queue_events
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_voice_queue_events();

DROP TRIGGER IF EXISTS trg_bridge_customer_onboarding_events ON public.customer_onboarding_events;
CREATE TRIGGER trg_bridge_customer_onboarding_events AFTER INSERT ON public.customer_onboarding_events
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_customer_onboarding_events();

DROP TRIGGER IF EXISTS trg_bridge_implementation_project_events ON public.implementation_project_events;
CREATE TRIGGER trg_bridge_implementation_project_events AFTER INSERT ON public.implementation_project_events
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_implementation_project_events();

DROP TRIGGER IF EXISTS trg_bridge_usage_events ON public.usage_events;
CREATE TRIGGER trg_bridge_usage_events AFTER INSERT ON public.usage_events
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_usage_events();

DROP TRIGGER IF EXISTS trg_bridge_executive_recommendations ON public.executive_recommendations;
CREATE TRIGGER trg_bridge_executive_recommendations AFTER INSERT ON public.executive_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_executive_recommendations();

DROP TRIGGER IF EXISTS trg_bridge_customer_success_signals ON public.customer_success_signals;
CREATE TRIGGER trg_bridge_customer_success_signals AFTER INSERT ON public.customer_success_signals
  FOR EACH ROW EXECUTE FUNCTION public.kernel_bridge_customer_success_signals();
