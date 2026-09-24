-- Segredo do agendador interno da sincronização mymia.world
INSERT INTO public._cron_config (key, value)
VALUES ('mymia_auto_sync_cron_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

-- Reconciliação horária: traz o que falta e verifica atualizações
SELECT cron.unschedule('mymia-crm-auto-sync')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mymia-crm-auto-sync');

SELECT cron.schedule(
  'mymia-crm-auto-sync',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/mymia-crm-auto-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public._cron_config WHERE key = 'mymia_auto_sync_cron_secret')
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  );
  $$
);