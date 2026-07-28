CREATE OR REPLACE FUNCTION public.saft_imports_watchdog()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.saft_imports
  SET status = 'failed',
      error_message = COALESCE(error_message, 'Tempo limite excedido (sem progresso há mais de 15 minutos). Tente novamente.'),
      updated_at = now()
  WHERE status IN ('analyzing','importing')
    AND COALESCE(last_step_at, started_at, updated_at, created_at) < now() - interval '15 minutes';
$$;