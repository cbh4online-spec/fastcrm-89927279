
-- ============================================================
-- Enterprise Memory & Learning Layer
-- ============================================================

-- 1. workspace_memories
CREATE TABLE public.workspace_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_type TEXT,
  source_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  context_snapshot_json JSONB DEFAULT '{}',
  outcome_snapshot_json JSONB DEFAULT '{}',
  confidence NUMERIC(3,2) DEFAULT 0.50,
  importance_score INT DEFAULT 50,
  freshness_score INT DEFAULT 100,
  validity_status TEXT DEFAULT 'valid',
  reuse_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_memories_lookup ON public.workspace_memories(workspace_id, memory_type, validity_status);

ALTER TABLE public.workspace_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace memories"
  ON public.workspace_memories FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages workspace memories"
  ON public.workspace_memories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. workspace_memory_links
CREATE TABLE public.workspace_memory_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES public.workspace_memories(id) ON DELETE CASCADE,
  linked_type TEXT NOT NULL,
  linked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_memory_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view memory links"
  ON public.workspace_memory_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages memory links"
  ON public.workspace_memory_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. workspace_learning_cycles
CREATE TABLE public.workspace_learning_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cycle_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  summary TEXT,
  memories_created INT DEFAULT 0,
  memories_updated INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_learning_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view learning cycles"
  ON public.workspace_learning_cycles FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages learning cycles"
  ON public.workspace_learning_cycles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. memory_usage_logs
CREATE TABLE public.memory_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES public.workspace_memories(id) ON DELETE CASCADE,
  used_by_type TEXT,
  used_by_id TEXT,
  outcome_type TEXT,
  outcome_id TEXT,
  outcome_quality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view memory usage logs"
  ON public.memory_usage_logs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages memory usage logs"
  ON public.memory_usage_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. memory_settings
CREATE TABLE public.memory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  auto_extract_enabled BOOLEAN DEFAULT false,
  min_confidence_threshold NUMERIC(3,2) DEFAULT 0.30,
  max_memories_per_query INT DEFAULT 5,
  memory_decay_days INT DEFAULT 90,
  financial_weight_multiplier NUMERIC(3,2) DEFAULT 1.50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view memory settings"
  ON public.memory_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage memory settings"
  ON public.memory_settings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages memory settings"
  ON public.memory_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Enable realtime on workspace_memories
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_memories;
