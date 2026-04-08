
-- ============================================================
-- Assignment Rules
-- ============================================================
CREATE TABLE public.assignment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company', 'opportunity')),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('manual_default', 'round_robin', 'capacity_based', 'source_based', 'territory_based', 'company_based')),
  name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  conditions_json JSONB DEFAULT '{}',
  target_manager_id UUID,
  rotation_group_id UUID,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view assignment rules"
  ON public.assignment_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = assignment_rules.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Owners and admins can manage assignment rules"
  ON public.assignment_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = assignment_rules.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- Assignment Rotation Groups
-- ============================================================
CREATE TABLE public.assignment_rotation_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company', 'opportunity')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_assigned_manager_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assignment_rotation_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rotation groups"
  ON public.assignment_rotation_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = assignment_rotation_groups.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Owners and admins can manage rotation groups"
  ON public.assignment_rotation_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = assignment_rotation_groups.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- Rotation Group Members
-- ============================================================
CREATE TABLE public.rotation_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.assignment_rotation_groups(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rotation_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rotation group members"
  ON public.rotation_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = rotation_group_members.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Owners and admins can manage rotation group members"
  ON public.rotation_group_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = rotation_group_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- Entity Assignment Logs (audit trail)
-- ============================================================
CREATE TABLE public.entity_assignment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company', 'opportunity')),
  entity_id UUID NOT NULL,
  entity_name TEXT,
  previous_manager_id UUID,
  new_manager_id UUID,
  assignment_mode TEXT NOT NULL CHECK (assignment_mode IN ('manual', 'bulk', 'round_robin', 'auto_capacity', 'fallback')),
  rule_id UUID REFERENCES public.assignment_rules(id) ON DELETE SET NULL,
  assigned_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view assignment logs"
  ON public.entity_assignment_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_assignment_logs.workspace_id
        AND wm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Owners and admins can insert assignment logs"
  ON public.entity_assignment_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = entity_assignment_logs.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agent')
    )
    OR public.is_super_admin(auth.uid())
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_assignment_rules_workspace ON public.assignment_rules(workspace_id);
CREATE INDEX idx_assignment_rules_active ON public.assignment_rules(workspace_id, is_active, entity_type);
CREATE INDEX idx_rotation_groups_workspace ON public.assignment_rotation_groups(workspace_id);
CREATE INDEX idx_rotation_members_group ON public.rotation_group_members(group_id, is_active, position);
CREATE INDEX idx_assignment_logs_workspace ON public.entity_assignment_logs(workspace_id, created_at DESC);
CREATE INDEX idx_assignment_logs_entity ON public.entity_assignment_logs(entity_type, entity_id);
CREATE INDEX idx_assignment_logs_manager ON public.entity_assignment_logs(new_manager_id, created_at DESC);

-- FK for rotation_group_id in assignment_rules
ALTER TABLE public.assignment_rules
  ADD CONSTRAINT fk_assignment_rules_rotation_group
  FOREIGN KEY (rotation_group_id) REFERENCES public.assignment_rotation_groups(id) ON DELETE SET NULL;
