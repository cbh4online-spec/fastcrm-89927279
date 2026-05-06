
-- ============================================================
-- Fase 1P.1 — Voice Provider Integration (schema extensions)
-- ============================================================

-- 1) voice_provider_instances: novos campos
ALTER TABLE public.voice_provider_instances
  ADD COLUMN IF NOT EXISTS auth_type text,
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_status text,
  ADD COLUMN IF NOT EXISTS last_error text;

DO $$ BEGIN
  ALTER TABLE public.voice_provider_instances
    ADD CONSTRAINT voice_provider_instances_auth_type_check
    CHECK (auth_type IS NULL OR auth_type = ANY (ARRAY['basic','bearer','api_key','oauth','custom']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) voice_call_logs: novos campos
ALTER TABLE public.voice_call_logs
  ADD COLUMN IF NOT EXISTS provider_parent_call_id text,
  ADD COLUMN IF NOT EXISTS provider_raw_status text,
  ADD COLUMN IF NOT EXISTS callback_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recording_provider_id text,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS provider_cost_amount numeric(12,4),
  ADD COLUMN IF NOT EXISTS margin_amount numeric(12,4),
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'not_billable',
  ADD COLUMN IF NOT EXISTS webhook_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.voice_call_logs
    ADD CONSTRAINT voice_call_logs_billing_status_check
    CHECK (billing_status = ANY (ARRAY['not_billable','pending','billed','disputed','waived']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) voice_provider_logs: novos campos
ALTER TABLE public.voice_provider_logs
  ADD COLUMN IF NOT EXISTS endpoint text,
  ADD COLUMN IF NOT EXISTS headers jsonb,
  ADD COLUMN IF NOT EXISTS normalized_payload jsonb,
  ADD COLUMN IF NOT EXISTS status_code integer,
  ADD COLUMN IF NOT EXISTS success boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

-- Expandir direction se necessário (drop+recreate constraint se existir)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'voice_provider_logs'
    AND pg_get_constraintdef(c.oid) ILIKE '%direction%';
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.voice_provider_logs DROP CONSTRAINT %I', conname);
  END IF;
  ALTER TABLE public.voice_provider_logs
    ADD CONSTRAINT voice_provider_logs_direction_check
    CHECK (direction IS NULL OR direction = ANY (ARRAY[
      'outbound_request','inbound_webhook','status_callback','recording_callback','test','error'
    ]));
END $$;

CREATE INDEX IF NOT EXISTS idx_voice_provider_logs_processed
  ON public.voice_provider_logs (workspace_id, processed, created_at DESC);

-- 4) voice_provider_rates (nova tabela)
CREATE TABLE IF NOT EXISTS public.voice_provider_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  country text NOT NULL,
  destination_type text NOT NULL DEFAULT 'unknown'
    CHECK (destination_type = ANY (ARRAY['fixed','mobile','toll_free','international','unknown'])),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction = ANY (ARRAY['inbound','outbound'])),
  currency text NOT NULL DEFAULT 'EUR',
  cost_per_minute numeric(12,4),
  connection_fee numeric(12,4),
  billing_increment_seconds integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_provider_rates_lookup
  ON public.voice_provider_rates (workspace_id, provider_name, country, destination_type, direction, active);

ALTER TABLE public.voice_provider_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members manage voice_provider_rates" ON public.voice_provider_rates;
CREATE POLICY "members manage voice_provider_rates"
  ON public.voice_provider_rates
  FOR ALL
  TO authenticated
  USING (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = voice_provider_rates.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = voice_provider_rates.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_voice_provider_rates_updated_at ON public.voice_provider_rates;
CREATE TRIGGER trg_voice_provider_rates_updated_at
  BEFORE UPDATE ON public.voice_provider_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
