-- Conversation Objectives: CRM-Driven Goal System
-- Inspired by Ensi - structured data collection tied to CRM fields

-- Main conversation_objectives table
CREATE TABLE public.conversation_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Objective definition
  objective_name TEXT NOT NULL,
  objective_code TEXT NOT NULL,
  objective_description TEXT,
  
  -- Trigger and collection
  trigger_condition JSONB DEFAULT '{}',
  prompt_template TEXT,
  validation_rules JSONB DEFAULT '{}',
  
  -- CRM integration
  crm_entity TEXT NOT NULL DEFAULT 'lead',
  crm_field_to_update TEXT NOT NULL,
  crm_field_type TEXT DEFAULT 'text',
  
  -- Flow control
  sort_position INTEGER NOT NULL DEFAULT 0,
  skip_if_filled BOOLEAN NOT NULL DEFAULT true,
  blocks_next_questions BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  
  -- Completion behavior
  on_complete_action TEXT DEFAULT 'continue',
  on_complete_message TEXT,
  on_complete_update JSONB DEFAULT '{}',
  
  -- Scope
  persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  flow_id UUID,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, objective_code)
);

-- Objective completion tracking
CREATE TABLE public.conversation_objective_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  lead_id UUID,
  objective_id UUID NOT NULL REFERENCES public.conversation_objectives(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  collected_value TEXT,
  collected_at TIMESTAMP WITH TIME ZONE,
  crm_updated BOOLEAN DEFAULT false,
  crm_update_error TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, objective_id)
);

-- Phase options for select-type objectives
CREATE TABLE public.objective_phase_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.conversation_objectives(id) ON DELETE CASCADE,
  option_value TEXT NOT NULL,
  option_label TEXT NOT NULL,
  option_description TEXT,
  sort_order INTEGER DEFAULT 0,
  triggers_stop BOOLEAN DEFAULT false,
  triggers_escalation BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_objective_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_phase_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view objectives"
  ON public.conversation_objectives FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_objectives.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage objectives"
  ON public.conversation_objectives FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_objectives.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_objectives.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can view progress"
  ON public.conversation_objective_progress FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_objective_progress.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can manage progress"
  ON public.conversation_objective_progress FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Workspace members can view phase options"
  ON public.objective_phase_options FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = objective_phase_options.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage phase options"
  ON public.objective_phase_options FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = objective_phase_options.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = objective_phase_options.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

-- Indexes
CREATE INDEX idx_objectives_workspace_active ON public.conversation_objectives(workspace_id, is_active, sort_position);
CREATE INDEX idx_objective_progress_conversation ON public.conversation_objective_progress(conversation_id, status);
CREATE INDEX idx_phase_options_objective ON public.objective_phase_options(objective_id, sort_order);

-- Triggers
CREATE TRIGGER update_conversation_objectives_updated_at
  BEFORE UPDATE ON public.conversation_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objective_progress_updated_at
  BEFORE UPDATE ON public.conversation_objective_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next objective
CREATE OR REPLACE FUNCTION public.get_next_objective(
  p_workspace_id UUID,
  p_conversation_id UUID,
  p_lead_id UUID DEFAULT NULL,
  p_persona_id UUID DEFAULT NULL
)
RETURNS TABLE (
  objective_id UUID,
  objective_name TEXT,
  objective_code TEXT,
  prompt_template TEXT,
  crm_field TEXT,
  sort_pos INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    co.id,
    co.objective_name,
    co.objective_code,
    co.prompt_template,
    co.crm_field_to_update,
    co.sort_position
  FROM conversation_objectives co
  LEFT JOIN conversation_objective_progress cop 
    ON cop.objective_id = co.id AND cop.conversation_id = p_conversation_id
  WHERE co.workspace_id = p_workspace_id
    AND co.is_active = true
    AND (co.persona_id IS NULL OR co.persona_id = p_persona_id)
    AND (cop.id IS NULL OR cop.status NOT IN ('completed', 'skipped'))
  ORDER BY co.sort_position ASC
  LIMIT 1;
END;
$$;

-- Function to complete objective
CREATE OR REPLACE FUNCTION public.complete_objective(
  p_conversation_id UUID,
  p_objective_id UUID,
  p_collected_value TEXT,
  p_lead_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_objective conversation_objectives%ROWTYPE;
BEGIN
  SELECT * INTO v_objective FROM conversation_objectives WHERE id = p_objective_id;
  
  IF v_objective.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Objective not found');
  END IF;
  
  INSERT INTO conversation_objective_progress (
    workspace_id, conversation_id, lead_id, objective_id, 
    status, collected_value, collected_at, attempts
  )
  VALUES (
    v_objective.workspace_id, p_conversation_id, p_lead_id, p_objective_id,
    'completed', p_collected_value, now(), 1
  )
  ON CONFLICT (conversation_id, objective_id) 
  DO UPDATE SET 
    status = 'completed',
    collected_value = p_collected_value,
    collected_at = now(),
    attempts = conversation_objective_progress.attempts + 1,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'objective_code', v_objective.objective_code,
    'on_complete_action', v_objective.on_complete_action,
    'on_complete_message', v_objective.on_complete_message,
    'blocks_next', v_objective.blocks_next_questions,
    'crm_field', v_objective.crm_field_to_update,
    'crm_entity', v_objective.crm_entity
  );
END;
$$;

COMMENT ON TABLE public.conversation_objectives IS 'CRM-driven conversation objectives';
COMMENT ON COLUMN public.conversation_objectives.skip_if_filled IS 'Skip if CRM field already has value';
COMMENT ON COLUMN public.conversation_objectives.blocks_next_questions IS 'Must complete before continuing';