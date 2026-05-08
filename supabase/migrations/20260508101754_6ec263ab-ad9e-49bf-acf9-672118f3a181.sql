-- LeadChef Phase 9: Templates and Automations

CREATE TABLE IF NOT EXISTS public.leadchef_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadchef_msg_templates_ws_cat
  ON public.leadchef_message_templates(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_leadchef_msg_templates_ws_active
  ON public.leadchef_message_templates(workspace_id, is_active);

ALTER TABLE public.leadchef_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace templates"
  ON public.leadchef_message_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_message_templates.workspace_id
      AND user_id = auth.uid()
  ));

CREATE POLICY "Members can insert workspace templates"
  ON public.leadchef_message_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_message_templates.workspace_id
      AND user_id = auth.uid()
  ));

CREATE POLICY "Members can update workspace templates"
  ON public.leadchef_message_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_message_templates.workspace_id
      AND user_id = auth.uid()
  ));

CREATE POLICY "Members can delete workspace templates"
  ON public.leadchef_message_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_message_templates.workspace_id
      AND user_id = auth.uid()
  ));

CREATE TRIGGER trg_leadchef_msg_templates_updated
  BEFORE UPDATE ON public.leadchef_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.leadchef_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  action_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, key)
);

ALTER TABLE public.leadchef_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace automations"
  ON public.leadchef_automation_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_automation_rules.workspace_id
      AND user_id = auth.uid()
  ));

CREATE POLICY "Members can insert workspace automations"
  ON public.leadchef_automation_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_automation_rules.workspace_id
      AND user_id = auth.uid()
  ));

CREATE POLICY "Members can update workspace automations"
  ON public.leadchef_automation_rules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_automation_rules.workspace_id
      AND user_id = auth.uid()
  ));

CREATE POLICY "Members can delete workspace automations"
  ON public.leadchef_automation_rules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = leadchef_automation_rules.workspace_id
      AND user_id = auth.uid()
  ));

CREATE TRIGGER trg_leadchef_automation_rules_updated
  BEFORE UPDATE ON public.leadchef_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
