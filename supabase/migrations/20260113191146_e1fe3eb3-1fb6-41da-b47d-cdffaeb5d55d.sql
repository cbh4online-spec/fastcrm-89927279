-- Create enum for trigger types
CREATE TYPE public.automation_trigger AS ENUM (
  'lead_created',
  'opportunity_stage_changed',
  'payment_confirmed'
);

-- Create enum for action types
CREATE TYPE public.automation_action_type AS ENUM (
  'create_task',
  'move_opportunity_stage',
  'send_message',
  'notify_user'
);

-- Create enum for condition operators
CREATE TYPE public.condition_operator AS ENUM (
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty'
);

-- Create enum for execution status
CREATE TYPE public.execution_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

-- Create automation_rules table
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger automation_trigger NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create automation_conditions table (simple field comparisons)
CREATE TABLE public.automation_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  operator condition_operator NOT NULL,
  value TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create automation_actions table
CREATE TABLE public.automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  action_type automation_action_type NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create automation_logs table for execution history
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  trigger_data JSONB NOT NULL DEFAULT '{}',
  status execution_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  actions_executed JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_rules
CREATE POLICY "Members can view automation rules"
ON public.automation_rules FOR SELECT
TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create automation rules"
ON public.automation_rules FOR INSERT
TO authenticated
WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Admins can update automation rules"
ON public.automation_rules FOR UPDATE
TO authenticated
USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete automation rules"
ON public.automation_rules FOR DELETE
TO authenticated
USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- RLS Policies for automation_conditions (based on parent rule access)
CREATE POLICY "Members can view conditions"
ON public.automation_conditions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.automation_rules r
  WHERE r.id = rule_id AND is_workspace_member(auth.uid(), r.workspace_id)
));

CREATE POLICY "Admins can manage conditions"
ON public.automation_conditions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.automation_rules r
  WHERE r.id = rule_id AND is_workspace_admin_or_owner(auth.uid(), r.workspace_id)
));

-- RLS Policies for automation_actions (based on parent rule access)
CREATE POLICY "Members can view actions"
ON public.automation_actions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.automation_rules r
  WHERE r.id = rule_id AND is_workspace_member(auth.uid(), r.workspace_id)
));

CREATE POLICY "Admins can manage actions"
ON public.automation_actions FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.automation_rules r
  WHERE r.id = rule_id AND is_workspace_admin_or_owner(auth.uid(), r.workspace_id)
));

-- RLS Policies for automation_logs
CREATE POLICY "Members can view logs"
ON public.automation_logs FOR SELECT
TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "System can insert logs"
ON public.automation_logs FOR INSERT
TO authenticated
WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Indexes for performance
CREATE INDEX idx_automation_rules_workspace ON public.automation_rules(workspace_id);
CREATE INDEX idx_automation_conditions_rule ON public.automation_conditions(rule_id);
CREATE INDEX idx_automation_actions_rule ON public.automation_actions(rule_id);
CREATE INDEX idx_automation_logs_rule ON public.automation_logs(rule_id);
CREATE INDEX idx_automation_logs_workspace ON public.automation_logs(workspace_id);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(status);

-- Triggers for updated_at
CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();