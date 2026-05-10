
-- Bot rules table
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact','contains','starts_with','regex')),
  case_sensitive BOOLEAN NOT NULL DEFAULT false,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  reply_text TEXT,
  reply_media_url TEXT,
  reply_media_mime_type TEXT,
  attach_product_id UUID,
  send_once_per_conversation BOOLEAN NOT NULL DEFAULT false,
  cooldown_minutes INTEGER NOT NULL DEFAULT 0,
  handoff_to_human BOOLEAN NOT NULL DEFAULT false,
  handoff_assign_to_user_id UUID,
  respect_working_hours BOOLEAN NOT NULL DEFAULT false,
  working_hours_start TIME,
  working_hours_end TIME,
  working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  match_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_bot_rules_workspace ON public.whatsapp_bot_rules(workspace_id, is_active, priority);

-- Logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_bot_rule_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES public.whatsapp_bot_rules(id) ON DELETE CASCADE,
  conversation_id UUID,
  message_id UUID,
  matched_keyword TEXT,
  message_excerpt TEXT,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  handoff_triggered BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_bot_rule_logs_workspace ON public.whatsapp_bot_rule_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_bot_rule_logs_rule ON public.whatsapp_bot_rule_logs(rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_bot_rule_logs_conv ON public.whatsapp_bot_rule_logs(conversation_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_bot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_rule_logs ENABLE ROW LEVEL SECURITY;

-- RLS rules: workspace members manage rules
CREATE POLICY "Workspace members read bot rules"
  ON public.whatsapp_bot_rules FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members insert bot rules"
  ON public.whatsapp_bot_rules FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members update bot rules"
  ON public.whatsapp_bot_rules FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members delete bot rules"
  ON public.whatsapp_bot_rules FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Logs: members read; service_role writes
CREATE POLICY "Workspace members read bot rule logs"
  ON public.whatsapp_bot_rule_logs FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Trigger to keep updated_at fresh
CREATE TRIGGER set_wa_bot_rules_updated_at
  BEFORE UPDATE ON public.whatsapp_bot_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
