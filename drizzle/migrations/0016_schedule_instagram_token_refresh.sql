-- Segredo dedicado para o cron de renovação de tokens do Instagram
INSERT INTO public._cron_config (key, value)
VALUES ('instagram_token_refresh_cron_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Renovação diária dos tokens de longa duração do Instagram (expiram em 60 dias)
SELECT cron.unschedule('instagram-token-refresh-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'instagram-token-refresh-daily');

SELECT cron.schedule(
  'instagram-token-refresh-daily',
  '30 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/instagram-token-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public._cron_config WHERE key = 'instagram_token_refresh_cron_secret')
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  );
  $$
);