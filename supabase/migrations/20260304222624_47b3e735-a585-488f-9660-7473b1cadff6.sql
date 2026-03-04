
-- System Health & Diagnostics tables

CREATE TABLE public.system_function_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  module_id text,
  request_id text,
  status text NOT NULL DEFAULT 'success',
  latency_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_function_runs_ws_created ON public.system_function_runs(workspace_id, created_at DESC);
CREATE INDEX idx_system_function_runs_request_id ON public.system_function_runs(request_id) WHERE request_id IS NOT NULL;
ALTER TABLE public.system_function_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_smoke_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  total_checks integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running'
);
ALTER TABLE public.system_smoke_test_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_smoke_test_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.system_smoke_test_runs(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  check_name text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_smoke_test_failures ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feature_registry_runtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  last_error text,
  failures_24h integer NOT NULL DEFAULT 0,
  failures_7d integer NOT NULL DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 100.00,
  p95_latency_ms integer DEFAULT 0,
  smoke_status text NOT NULL DEFAULT 'pending',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, module_id)
);
ALTER TABLE public.feature_registry_runtime ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read all 4 tables
CREATE POLICY "Workspace members can read system_function_runs"
  ON public.system_function_runs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can read system_smoke_test_runs"
  ON public.system_smoke_test_runs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can read system_smoke_test_failures"
  ON public.system_smoke_test_failures FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can read feature_registry_runtime"
  ON public.feature_registry_runtime FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
