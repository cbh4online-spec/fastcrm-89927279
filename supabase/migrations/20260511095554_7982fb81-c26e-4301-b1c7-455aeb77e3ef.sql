-- Internal table to hold cron-related secrets accessible only via service_role
CREATE TABLE IF NOT EXISTS public._cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public._cron_config ENABLE ROW LEVEL SECURITY;
-- No policies → no access from anon/authenticated; service_role and superuser bypass RLS.
REVOKE ALL ON public._cron_config FROM anon, authenticated;