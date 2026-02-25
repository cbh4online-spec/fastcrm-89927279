ALTER TABLE public.ask_fastcrm_query_logs
  ADD COLUMN IF NOT EXISTS routed_via text DEFAULT 'deterministic',
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2) DEFAULT 1.0;