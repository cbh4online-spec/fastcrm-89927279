
DO $$
BEGIN
  PERFORM cron.unschedule('gsc-auto-submit-sitemaps-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'gsc-auto-submit-sitemaps-daily',
  '15 4 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/gsc-cron-submit-sitemaps',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
