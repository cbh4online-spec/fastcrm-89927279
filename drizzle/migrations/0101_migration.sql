CREATE OR REPLACE FUNCTION public.wake_lead_icp_scorer_depth(_depth int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _depth <= 0 THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/score-leads-icp',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT value FROM public._cron_config WHERE key='lead_icp_cron_secret')),
    body := jsonb_build_object('trigger','chain','depth', least(_depth, 10)));
END $$;
REVOKE EXECUTE ON FUNCTION public.wake_lead_icp_scorer_depth(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wake_lead_icp_scorer_depth(int) TO service_role;