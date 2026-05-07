-- webhook_security_events: auditoria centralizada de validação de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,
  provider text NOT NULL,
  instance_id uuid,
  function_name text NOT NULL,
  validation_mode text NOT NULL CHECK (validation_mode IN ('hmac','shared_secret','token','none')),
  outcome text NOT NULL CHECK (outcome IN ('valid','invalid','missing_secret','no_signature','error','skipped')),
  reason text,
  remote_ip text,
  signature_header text,
  duration_ms integer,
  payload_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wse_created ON public.webhook_security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wse_workspace ON public.webhook_security_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wse_outcome ON public.webhook_security_events (outcome, created_at DESC);

ALTER TABLE public.webhook_security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wse_select_super_admin" ON public.webhook_security_events
  FOR SELECT USING (is_super_admin(auth.uid()));

-- INSERTs via service_role apenas (sem policy = bloqueado para clientes)

-- sprint_smoke_runs: resultados de smoke tests VoiceHub + portais
CREATE TABLE IF NOT EXISTS public.sprint_smoke_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite text NOT NULL CHECK (suite IN ('voicehub','customer_portal','proposal_portal','onboarding_portal')),
  workspace_id uuid,
  triggered_by uuid,
  status text NOT NULL CHECK (status IN ('pass','fail','warn','running')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ssr_suite_created ON public.sprint_smoke_runs (suite, created_at DESC);

ALTER TABLE public.sprint_smoke_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssr_select_super_admin" ON public.sprint_smoke_runs
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "ssr_insert_super_admin" ON public.sprint_smoke_runs
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()));