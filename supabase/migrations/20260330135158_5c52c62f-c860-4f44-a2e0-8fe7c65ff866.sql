
-- Create helpdesk_automations table
CREATE TABLE IF NOT EXISTS public.helpdesk_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'on_create',
  conditions JSONB DEFAULT '{}',
  action_type TEXT NOT NULL DEFAULT 'auto_assign_round_robin',
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.helpdesk_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view helpdesk automations in their workspace"
  ON public.helpdesk_automations FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert helpdesk automations in their workspace"
  ON public.helpdesk_automations FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update helpdesk automations in their workspace"
  ON public.helpdesk_automations FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete helpdesk automations in their workspace"
  ON public.helpdesk_automations FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_helpdesk_automations_workspace ON public.helpdesk_automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_helpdesk_automations_trigger ON public.helpdesk_automations(workspace_id, trigger_event);
CREATE INDEX IF NOT EXISTS idx_helpdesk_automations_active ON public.helpdesk_automations(workspace_id) WHERE is_active = true;
