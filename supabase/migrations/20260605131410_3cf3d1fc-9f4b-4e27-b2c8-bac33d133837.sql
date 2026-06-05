
-- Add cron secret for email-fetch-scheduler
INSERT INTO public._cron_config (key, value)
VALUES ('email_fetch_cron_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

-- Unschedule if already exists
SELECT cron.unschedule('email-fetch-scheduler')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-fetch-scheduler');

-- Schedule every 5 minutes
SELECT cron.schedule(
  'email-fetch-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/email-fetch-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8',
      'x-cron-secret', (SELECT value FROM public._cron_config WHERE key = 'email_fetch_cron_secret')
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  );
  $$
);
