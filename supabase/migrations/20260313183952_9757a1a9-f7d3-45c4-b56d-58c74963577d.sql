
-- Circuit breaker states
CREATE TABLE IF NOT EXISTS public.circuit_breaker_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'CLOSED',
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, module_id)
);

-- Circuit breaker history
CREATE TABLE IF NOT EXISTS public.circuit_breaker_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dependency cache metrics
CREATE TABLE IF NOT EXISTS public.dependency_cache_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  last_invalidation_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cb_states_workspace ON public.circuit_breaker_states(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cb_history_workspace_module ON public.circuit_breaker_history(workspace_id, module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_workspace ON public.dependency_cache_metrics(workspace_id, period_start);

-- RLS
ALTER TABLE public.circuit_breaker_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_cache_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage circuit breaker states for their workspace"
  ON public.circuit_breaker_states FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can read circuit breaker history for their workspace"
  ON public.circuit_breaker_history FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can insert circuit breaker history for their workspace"
  ON public.circuit_breaker_history FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can manage cache metrics for their workspace"
  ON public.dependency_cache_metrics FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
