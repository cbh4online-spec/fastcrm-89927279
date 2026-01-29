-- =============================================
-- SECTION 13: SUCCESS CRITERIA & COMPLIANCE
-- Validation, metrics, and multi-tenant health
-- =============================================

-- 1. COMMERCIAL RULES COMPLIANCE
-- Tracks rule violations and compliance rate
CREATE TABLE public.compliance_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message_id UUID,
  
  -- Violation details
  rule_id UUID REFERENCES public.conversation_rules(id) ON DELETE SET NULL,
  rule_type TEXT NOT NULL, -- DONT, STOP, blocked_action
  rule_description TEXT NOT NULL,
  
  -- What happened
  violation_type TEXT NOT NULL, -- attempted, executed, detected_post
  violated_content TEXT, -- The AI response that violated
  expected_behavior TEXT,
  
  -- Severity
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  
  -- Resolution
  auto_blocked BOOLEAN DEFAULT false, -- Was it caught before sending?
  corrective_action TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Impact
  led_to_escalation BOOLEAN DEFAULT false,
  led_to_complaint BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance violations in their workspace"
  ON public.compliance_violations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 2. SUCCESS METRICS (KPIs)
-- Daily aggregated success metrics per workspace
CREATE TABLE public.success_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- Volume
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  unique_leads INTEGER DEFAULT 0,
  
  -- Compliance (AI nunca quebra regras comerciais)
  compliance_rate NUMERIC(5,2), -- % of conversations without violations
  violations_count INTEGER DEFAULT 0,
  violations_blocked INTEGER DEFAULT 0, -- Caught before sending
  violations_critical INTEGER DEFAULT 0,
  
  -- Predictability (Conversas previsíveis e auditáveis)
  avg_conversation_score NUMERIC(5,2),
  conversations_audited INTEGER DEFAULT 0,
  audit_pass_rate NUMERIC(5,2),
  avg_messages_to_goal NUMERIC(5,2),
  goal_path_deviation_rate NUMERIC(5,2), -- % that deviated from expected journey
  
  -- Classification (Leads corretamente classificados)
  leads_qualified INTEGER DEFAULT 0,
  leads_disqualified INTEGER DEFAULT 0,
  classification_accuracy NUMERIC(5,2), -- Based on human review
  reclassification_rate NUMERIC(5,2), -- How often humans override AI
  
  -- Conversion (Pré-inscrição sem fricção)
  preregistration_started INTEGER DEFAULT 0,
  preregistration_completed INTEGER DEFAULT 0,
  preregistration_conversion_rate NUMERIC(5,2),
  avg_time_to_preregistration_minutes NUMERIC(8,2),
  friction_points_detected INTEGER DEFAULT 0,
  
  -- Scale (Escala multi-cliente real)
  concurrent_conversations_peak INTEGER DEFAULT 0,
  avg_response_latency_ms INTEGER,
  timeout_rate NUMERIC(5,2),
  escalation_rate NUMERIC(5,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.success_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view success metrics in their workspace"
  ON public.success_metrics_daily FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 3. SUCCESS THRESHOLDS
-- Configurable thresholds for each success criteria
CREATE TABLE public.success_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  metric_key TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL, -- compliance, predictability, classification, conversion, scale
  
  -- Thresholds
  target_value NUMERIC(10,2) NOT NULL,
  warning_threshold NUMERIC(10,2), -- Yellow alert
  critical_threshold NUMERIC(10,2), -- Red alert
  
  -- Direction
  higher_is_better BOOLEAN NOT NULL DEFAULT true,
  
  -- Active
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, metric_key)
);

-- Enable RLS
ALTER TABLE public.success_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view thresholds in their workspace"
  ON public.success_thresholds FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage thresholds in their workspace"
  ON public.success_thresholds FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- 4. MULTI-TENANT HEALTH MONITORING
-- Real-time health status per workspace
CREATE TABLE public.workspace_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  
  -- Overall status
  health_status TEXT NOT NULL DEFAULT 'healthy', -- healthy, warning, critical, degraded
  last_health_check TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Component status
  ai_engine_status TEXT DEFAULT 'operational',
  knowledge_base_status TEXT DEFAULT 'operational',
  rules_engine_status TEXT DEFAULT 'operational',
  integration_status TEXT DEFAULT 'operational',
  
  -- Current load
  active_conversations INTEGER DEFAULT 0,
  messages_last_hour INTEGER DEFAULT 0,
  avg_latency_last_hour_ms INTEGER,
  error_rate_last_hour NUMERIC(5,2),
  
  -- Capacity
  capacity_utilization NUMERIC(5,2), -- % of max capacity
  throttling_active BOOLEAN DEFAULT false,
  
  -- Alerts
  active_alerts JSONB DEFAULT '[]'::JSONB,
  
  -- Last issues
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health in their workspace"
  ON public.workspace_health FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 5. VALIDATION CHECKPOINTS
-- Pre-send validation results
CREATE TABLE public.response_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  
  -- Response being validated
  proposed_response TEXT NOT NULL,
  
  -- Validation checks
  passed_all_checks BOOLEAN NOT NULL,
  
  -- Individual checks
  check_commercial_rules BOOLEAN,
  check_knowledge_bounds BOOLEAN,
  check_vibe_compliance BOOLEAN,
  check_length_limits BOOLEAN,
  check_forbidden_content BOOLEAN,
  check_persona_alignment BOOLEAN,
  
  -- Failed checks details
  failed_checks JSONB DEFAULT '[]'::JSONB,
  -- Format: [{ check, reason, severity }]
  
  -- Action taken
  action_taken TEXT NOT NULL, -- approved, modified, blocked, escalated
  modified_response TEXT, -- If action was 'modified'
  
  -- Timing
  validation_latency_ms INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.response_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations in their workspace"
  ON public.response_validations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- HELPER FUNCTIONS

-- Check if response passes all commercial rules
CREATE OR REPLACE FUNCTION public.validate_response_compliance(
  p_workspace_id UUID,
  p_response TEXT,
  p_persona_id UUID DEFAULT NULL,
  p_conversation_context JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_passed BOOLEAN := true;
  v_failed_checks JSONB := '[]'::JSONB;
  v_rule RECORD;
BEGIN
  -- Check DONT rules
  FOR v_rule IN 
    SELECT * FROM conversation_rules 
    WHERE workspace_id = p_workspace_id 
      AND rule_type = 'DONT' 
      AND is_active = true
      AND (persona_id IS NULL OR persona_id = p_persona_id)
  LOOP
    -- Simple keyword/pattern check (can be enhanced with AI)
    IF v_rule.pattern IS NOT NULL AND p_response ~* v_rule.pattern THEN
      v_passed := false;
      v_failed_checks := v_failed_checks || jsonb_build_object(
        'check', 'commercial_rules',
        'rule_id', v_rule.id,
        'rule_description', v_rule.description,
        'severity', COALESCE(v_rule.severity, 'medium')
      );
    END IF;
  END LOOP;
  
  -- Check length limits (from channel config or vibe)
  -- Additional checks can be added here
  
  v_result := jsonb_build_object(
    'passed', v_passed,
    'failed_checks', v_failed_checks,
    'checked_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- Calculate daily success metrics
CREATE OR REPLACE FUNCTION public.calculate_success_metrics(
  p_workspace_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics JSONB;
  v_compliance_rate NUMERIC;
  v_conversion_rate NUMERIC;
BEGIN
  -- Calculate compliance rate
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 100.0
      ELSE (1 - (COUNT(*) FILTER (WHERE cv.id IS NOT NULL)::NUMERIC / NULLIF(COUNT(DISTINCT c.id), 0))) * 100
    END
  INTO v_compliance_rate
  FROM conversations c
  LEFT JOIN compliance_violations cv ON cv.conversation_id = c.id AND cv.created_at::DATE = p_date
  WHERE c.workspace_id = p_workspace_id
    AND c.created_at::DATE = p_date;
  
  -- Return metrics summary
  v_metrics := jsonb_build_object(
    'date', p_date,
    'compliance_rate', COALESCE(v_compliance_rate, 100.0),
    'calculated_at', now()
  );
  
  RETURN v_metrics;
END;
$$;

-- Get workspace health summary
CREATE OR REPLACE FUNCTION public.get_workspace_health_summary(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health RECORD;
  v_thresholds_breached INTEGER := 0;
BEGIN
  SELECT * INTO v_health FROM workspace_health WHERE workspace_id = p_workspace_id;
  
  IF NOT FOUND THEN
    -- Create initial health record
    INSERT INTO workspace_health (workspace_id) VALUES (p_workspace_id)
    RETURNING * INTO v_health;
  END IF;
  
  RETURN jsonb_build_object(
    'status', v_health.health_status,
    'last_check', v_health.last_health_check,
    'components', jsonb_build_object(
      'ai_engine', v_health.ai_engine_status,
      'knowledge_base', v_health.knowledge_base_status,
      'rules_engine', v_health.rules_engine_status,
      'integrations', v_health.integration_status
    ),
    'load', jsonb_build_object(
      'active_conversations', v_health.active_conversations,
      'capacity_utilization', v_health.capacity_utilization,
      'throttling', v_health.throttling_active
    ),
    'alerts', v_health.active_alerts
  );
END;
$$;

-- INDEXES
CREATE INDEX idx_compliance_violations_workspace ON public.compliance_violations(workspace_id, created_at DESC);
CREATE INDEX idx_compliance_violations_conversation ON public.compliance_violations(conversation_id);
CREATE INDEX idx_compliance_violations_severity ON public.compliance_violations(workspace_id, severity) 
  WHERE severity IN ('high', 'critical');

CREATE INDEX idx_success_metrics_daily_workspace ON public.success_metrics_daily(workspace_id, metric_date DESC);

CREATE INDEX idx_success_thresholds_workspace ON public.success_thresholds(workspace_id, metric_category);

CREATE INDEX idx_response_validations_conversation ON public.response_validations(conversation_id);
CREATE INDEX idx_response_validations_failed ON public.response_validations(workspace_id) 
  WHERE passed_all_checks = false;

-- Insert default thresholds for new workspaces
CREATE OR REPLACE FUNCTION public.create_default_success_thresholds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compliance thresholds
  INSERT INTO success_thresholds (workspace_id, metric_key, metric_name, metric_category, target_value, warning_threshold, critical_threshold, higher_is_better)
  VALUES 
    (NEW.id, 'compliance_rate', 'Taxa de Conformidade', 'compliance', 99.0, 95.0, 90.0, true),
    (NEW.id, 'violations_critical', 'Violações Críticas', 'compliance', 0, 1, 5, false),
    
    -- Predictability thresholds
    (NEW.id, 'avg_conversation_score', 'Score Médio de Conversas', 'predictability', 75.0, 60.0, 50.0, true),
    (NEW.id, 'audit_pass_rate', 'Taxa de Aprovação em Auditoria', 'predictability', 90.0, 80.0, 70.0, true),
    
    -- Classification thresholds
    (NEW.id, 'classification_accuracy', 'Precisão de Classificação', 'classification', 90.0, 80.0, 70.0, true),
    (NEW.id, 'reclassification_rate', 'Taxa de Reclassificação', 'classification', 5.0, 15.0, 25.0, false),
    
    -- Conversion thresholds
    (NEW.id, 'preregistration_conversion_rate', 'Taxa de Conversão Pré-Inscrição', 'conversion', 30.0, 20.0, 10.0, true),
    (NEW.id, 'friction_points_detected', 'Pontos de Fricção', 'conversion', 0, 3, 10, false),
    
    -- Scale thresholds
    (NEW.id, 'avg_response_latency_ms', 'Latência Média (ms)', 'scale', 2000, 5000, 10000, false),
    (NEW.id, 'timeout_rate', 'Taxa de Timeout', 'scale', 1.0, 5.0, 10.0, false),
    (NEW.id, 'escalation_rate', 'Taxa de Escalação', 'scale', 10.0, 20.0, 30.0, false)
  ON CONFLICT (workspace_id, metric_key) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to create default thresholds (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_workspace_success_thresholds'
  ) THEN
    CREATE TRIGGER create_workspace_success_thresholds
      AFTER INSERT ON public.workspaces
      FOR EACH ROW
      EXECUTE FUNCTION public.create_default_success_thresholds();
  END IF;
END
$$;

-- Trigger for updated_at
CREATE TRIGGER update_success_thresholds_updated_at
  BEFORE UPDATE ON public.success_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workspace_health_updated_at
  BEFORE UPDATE ON public.workspace_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.compliance_violations IS 'Tracks commercial rule violations - Section 13: Success Criteria';
COMMENT ON TABLE public.success_metrics_daily IS 'Daily aggregated KPIs for success measurement - Section 13';
COMMENT ON TABLE public.success_thresholds IS 'Configurable targets and alert thresholds - Section 13';
COMMENT ON TABLE public.workspace_health IS 'Real-time multi-tenant health monitoring - Section 13';
COMMENT ON TABLE public.response_validations IS 'Pre-send validation checkpoints - Section 13';