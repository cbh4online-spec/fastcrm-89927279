
-- Schedule partner cart recovery every 30 min
DO $$
BEGIN
  PERFORM cron.unschedule('partner-cart-recovery-30min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'partner-cart-recovery-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url:='https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/partner-cart-recovery',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
