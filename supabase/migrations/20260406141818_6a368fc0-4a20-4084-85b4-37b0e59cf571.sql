
-- 1. Add form analytics + click heatmap columns to vertical_landing_events
ALTER TABLE public.vertical_landing_events
  ADD COLUMN IF NOT EXISTS field_name text,
  ADD COLUMN IF NOT EXISTS field_order smallint,
  ADD COLUMN IF NOT EXISTS click_x_pct real,
  ADD COLUMN IF NOT EXISTS click_y_pct real,
  ADD COLUMN IF NOT EXISTS click_element text;

-- 2. Add visitor_score to store_visitor_sessions
ALTER TABLE public.store_visitor_sessions
  ADD COLUMN IF NOT EXISTS visitor_score smallint DEFAULT 0;

-- 3. Popup Rules table
CREATE TABLE public.popup_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'exit_intent',
  trigger_value jsonb DEFAULT '{}',
  popup_type text NOT NULL DEFAULT 'cta',
  content jsonb NOT NULL DEFAULT '{}',
  target_pages text[] DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  max_shows_per_session smallint DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popup_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage popup_rules"
  ON public.popup_rules FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- 4. Popup Responses table
CREATE TABLE public.popup_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.popup_rules(id) ON DELETE SET NULL,
  session_id text,
  response_data jsonb DEFAULT '{}',
  device_type text,
  page_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popup_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert popup_responses"
  ON public.popup_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Workspace members can view popup_responses"
  ON public.popup_responses FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- 5. Conversion Goals table
CREATE TABLE public.conversion_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal_type text NOT NULL DEFAULT 'form_submit',
  goal_config jsonb NOT NULL DEFAULT '{}',
  target_value numeric,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversion_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage conversion_goals"
  ON public.conversion_goals FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- 6. Chat Canned Responses table
CREATE TABLE public.chat_canned_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  shortcut text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text DEFAULT 'geral',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage chat_canned_responses"
  ON public.chat_canned_responses FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_popup_rules_workspace ON public.popup_rules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_popup_responses_workspace ON public.popup_responses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_popup_responses_rule ON public.popup_responses(rule_id);
CREATE INDEX IF NOT EXISTS idx_conversion_goals_workspace ON public.conversion_goals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_canned_responses_workspace ON public.chat_canned_responses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vle_field_name ON public.vertical_landing_events(field_name) WHERE field_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vle_click ON public.vertical_landing_events(click_x_pct, click_y_pct) WHERE click_x_pct IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_svs_visitor_score ON public.store_visitor_sessions(visitor_score) WHERE visitor_score > 0;
