CREATE TABLE IF NOT EXISTS public.event_runtime_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  workspace_id uuid,
  entity_type text,
  entity_id uuid,
  source_module text,
  failure_stage text NOT NULL,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_runtime_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read event_runtime_failures"
  ON public.event_runtime_failures FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert event_runtime_failures"
  ON public.event_runtime_failures FOR INSERT TO authenticated WITH CHECK (true);