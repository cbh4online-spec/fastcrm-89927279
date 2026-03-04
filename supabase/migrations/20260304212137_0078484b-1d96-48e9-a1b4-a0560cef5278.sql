
-- =============================================
-- FastCRM Kernel v1 — Data Model
-- =============================================

-- 1) kernel_events (append-only event log)
CREATE TABLE public.kernel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_kind text NOT NULL,
  entity_id text NOT NULL,
  actor_type text NOT NULL DEFAULT 'user',
  actor_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  source_module text,
  source_route text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kernel_events_workspace ON public.kernel_events(workspace_id, created_at DESC);
CREATE INDEX idx_kernel_events_entity ON public.kernel_events(workspace_id, entity_kind, entity_id);
CREATE UNIQUE INDEX idx_kernel_events_idempotency ON public.kernel_events(workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.kernel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_events_select" ON public.kernel_events FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "kernel_events_insert" ON public.kernel_events FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 2) kernel_entities (normalized entity registry)
CREATE TABLE public.kernel_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL,
  entity_id text NOT NULL,
  title text,
  meta jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, kind, entity_id)
);
ALTER TABLE public.kernel_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_entities_select" ON public.kernel_entities FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "kernel_entities_insert" ON public.kernel_entities FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "kernel_entities_update" ON public.kernel_entities FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3) kernel_links (dependency graph)
CREATE TABLE public.kernel_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_kind text NOT NULL,
  from_id text NOT NULL,
  to_kind text NOT NULL,
  to_id text NOT NULL,
  relation_type text NOT NULL DEFAULT 'depends_on',
  confidence float NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kernel_links_from ON public.kernel_links(workspace_id, from_kind, from_id);
CREATE INDEX idx_kernel_links_to ON public.kernel_links(workspace_id, to_kind, to_id);
ALTER TABLE public.kernel_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_links_all" ON public.kernel_links FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4) kernel_actions_registry (action catalog)
CREATE TABLE public.kernel_actions_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  input_schema jsonb DEFAULT '{}'::jsonb,
  executor text,
  requires_approval boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE public.kernel_actions_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_actions_registry_select" ON public.kernel_actions_registry FOR SELECT TO authenticated USING (true);

-- 5) kernel_action_runs (action execution log)
CREATE TABLE public.kernel_action_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_key text NOT NULL,
  input jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  output jsonb,
  error text,
  related_event_id uuid REFERENCES public.kernel_events(id),
  related_decision_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX idx_kernel_action_runs_ws ON public.kernel_action_runs(workspace_id, created_at DESC);
ALTER TABLE public.kernel_action_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_action_runs_all" ON public.kernel_action_runs FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 6) kernel_decisions (decision log)
CREATE TABLE public.kernel_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL,
  priority float NOT NULL DEFAULT 0.5,
  summary text NOT NULL,
  rationale text,
  recommended_actions jsonb DEFAULT '[]'::jsonb,
  policy jsonb DEFAULT '{"mode":"approval"}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_kernel_decisions_ws ON public.kernel_decisions(workspace_id, status, created_at DESC);
ALTER TABLE public.kernel_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_decisions_all" ON public.kernel_decisions FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Add FK from action_runs to decisions now that table exists
ALTER TABLE public.kernel_action_runs
  ADD CONSTRAINT kernel_action_runs_decision_fk FOREIGN KEY (related_decision_id) REFERENCES public.kernel_decisions(id);

-- 7) kernel_decision_evidence
CREATE TABLE public.kernel_decision_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.kernel_decisions(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  ref_id text,
  snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_decision_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kernel_decision_evidence_select" ON public.kernel_decision_evidence FOR SELECT TO authenticated
  USING (decision_id IN (SELECT id FROM public.kernel_decisions WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));
CREATE POLICY "kernel_decision_evidence_insert" ON public.kernel_decision_evidence FOR INSERT TO authenticated
  WITH CHECK (decision_id IN (SELECT id FROM public.kernel_decisions WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

-- 8) context_bindings
CREATE TABLE public.context_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  asset_kind text NOT NULL,
  asset_id text NOT NULL,
  binding_type text NOT NULL DEFAULT 'uses',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_context_bindings_block ON public.context_bindings(block_id);
CREATE INDEX idx_context_bindings_asset ON public.context_bindings(workspace_id, asset_kind, asset_id);
ALTER TABLE public.context_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "context_bindings_all" ON public.context_bindings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 9) change_events
CREATE TABLE public.change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_kind text NOT NULL,
  entity_id text NOT NULL,
  change_type text NOT NULL DEFAULT 'updated',
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_change_events_ws ON public.change_events(workspace_id, created_at DESC);
ALTER TABLE public.change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "change_events_all" ON public.change_events FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 10) impact_map (persisted impact results)
CREATE TABLE public.impact_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  change_event_id uuid REFERENCES public.change_events(id) ON DELETE CASCADE,
  affected_kind text NOT NULL,
  affected_id text NOT NULL,
  status text NOT NULL DEFAULT 'needs_review',
  suggested_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impact_map_ws ON public.impact_map(workspace_id, status);
ALTER TABLE public.impact_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impact_map_all" ON public.impact_map FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 11) drift_scores
CREATE TABLE public.drift_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scope_type text NOT NULL DEFAULT 'asset',
  scope_kind text NOT NULL,
  scope_id text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  reasons jsonb DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, scope_type, scope_kind, scope_id)
);
CREATE INDEX idx_drift_scores_ws ON public.drift_scores(workspace_id, scope_type, score DESC);
ALTER TABLE public.drift_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drift_scores_all" ON public.drift_scores FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
