
-- Table: lead_duplicate_groups
CREATE TABLE public.lead_duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  duplicate_reason TEXT NOT NULL,
  match_type TEXT NOT NULL,
  matched_fields TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: lead_duplicate_group_items
CREATE TABLE public.lead_duplicate_group_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.lead_duplicate_groups(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  is_master_candidate BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, lead_id)
);

-- Table: lead_merge_audit
CREATE TABLE public.lead_merge_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  master_lead_id UUID NOT NULL,
  merged_lead_ids UUID[] NOT NULL DEFAULT '{}',
  merged_by UUID,
  merge_summary_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.lead_duplicate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_duplicate_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_merge_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_duplicate_groups
CREATE POLICY "Users can view own workspace duplicate groups"
  ON public.lead_duplicate_groups FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own workspace duplicate groups"
  ON public.lead_duplicate_groups FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- RLS policies for lead_duplicate_group_items
CREATE POLICY "Users can view own workspace duplicate group items"
  ON public.lead_duplicate_group_items FOR SELECT TO authenticated
  USING (group_id IN (
    SELECT id FROM lead_duplicate_groups WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage own workspace duplicate group items"
  ON public.lead_duplicate_group_items FOR ALL TO authenticated
  USING (group_id IN (
    SELECT id FROM lead_duplicate_groups WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) OR workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- RLS policies for lead_merge_audit
CREATE POLICY "Users can view own workspace merge audit"
  ON public.lead_merge_audit FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own workspace merge audit"
  ON public.lead_merge_audit FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_lead_dup_groups_workspace ON public.lead_duplicate_groups(workspace_id);
CREATE INDEX idx_lead_dup_groups_status ON public.lead_duplicate_groups(status);
CREATE INDEX idx_lead_dup_group_items_group ON public.lead_duplicate_group_items(group_id);
CREATE INDEX idx_lead_dup_group_items_lead ON public.lead_duplicate_group_items(lead_id);
CREATE INDEX idx_lead_merge_audit_workspace ON public.lead_merge_audit(workspace_id);
CREATE INDEX idx_lead_merge_audit_master ON public.lead_merge_audit(master_lead_id);
