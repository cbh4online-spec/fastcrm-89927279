
-- Add health columns to connections
ALTER TABLE public.whatsapp_zapi_connections
  ADD COLUMN IF NOT EXISTS consecutive_failures int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_health_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_alert_dismissed_until timestamptz;

-- Health events log
CREATE TABLE IF NOT EXISTS public.whatsapp_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  connection_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('disconnected','recovered','qr_expired','error','degraded')),
  from_status text,
  to_status text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whe_workspace_created ON public.whatsapp_health_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whe_connection ON public.whatsapp_health_events (connection_id);

ALTER TABLE public.whatsapp_health_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view health events" ON public.whatsapp_health_events;
CREATE POLICY "members can view health events"
  ON public.whatsapp_health_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = whatsapp_health_events.workspace_id
      AND wm.user_id = auth.uid()
  ));

-- No client INSERT/UPDATE/DELETE policies => only service_role can write.

-- Schedule the health monitor every 5 minutes via pg_cron + pg_net
DO $$
DECLARE
  v_url text := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/whatsapp-pro-health-monitor';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8';
BEGIN
  PERFORM cron.unschedule('whatsapp-pro-health-monitor');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'whatsapp-pro-health-monitor',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/whatsapp-pro-health-monitor',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8'
    ),
    body := jsonb_build_object('source','cron')
  ) AS request_id;
  $$
);
