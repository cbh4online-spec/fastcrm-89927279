
CREATE OR REPLACE FUNCTION public.saft_imports_watchdog()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.saft_imports
  SET status = 'failed',
      error_message = COALESCE(error_message, 'Tempo limite excedido (sem progresso há mais de 10 minutos). Tente novamente.'),
      updated_at = now()
  WHERE status IN ('analyzing','importing')
    AND COALESCE(started_at, updated_at, created_at) < now() - interval '10 minutes';
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('saft-imports-watchdog');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'saft-imports-watchdog',
  '*/5 * * * *',
  $$SELECT public.saft_imports_watchdog();$$
);
