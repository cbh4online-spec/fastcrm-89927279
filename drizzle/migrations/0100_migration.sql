ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS icp_summary text,
  ADD COLUMN IF NOT EXISTS icp_reasons jsonb,
  ADD COLUMN IF NOT EXISTS icp_scored_at timestamptz,
  ADD COLUMN IF NOT EXISTS icp_score_status text;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS call_worthy boolean GENERATED ALWAYS AS (coalesce(icp_fit_score,0) >= 70) STORED;
CREATE INDEX IF NOT EXISTS idx_leads_call_worthy ON public.leads(workspace_id, call_worthy) WHERE call_worthy;

CREATE TABLE public.lead_icp_score_queue (
  lead_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_icp_score_queue TO authenticated;
GRANT ALL ON public.lead_icp_score_queue TO service_role;
ALTER TABLE public.lead_icp_score_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read icp queue" ON public.lead_icp_score_queue FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));
CREATE INDEX idx_lead_icp_queue_pending ON public.lead_icp_score_queue(status, created_at);

CREATE TABLE public.lead_icp_job_state (
  key text PRIMARY KEY,
  workspace_id uuid,
  locked_until timestamptz,
  paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_icp_job_state TO authenticated;
GRANT ALL ON public.lead_icp_job_state TO service_role;
ALTER TABLE public.lead_icp_job_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read icp job state" ON public.lead_icp_job_state FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));
INSERT INTO public.lead_icp_job_state(key) VALUES ('global') ON CONFLICT DO NOTHING;

INSERT INTO public._cron_config(key, value) VALUES ('lead_icp_cron_secret', encode(gen_random_bytes(24),'hex')) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.wake_lead_icp_scorer()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/score-leads-icp',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT value FROM public._cron_config WHERE key='lead_icp_cron_secret')),
    body := '{"trigger":"enqueue","depth":10}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'wake_lead_icp_scorer failed: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_lead_icp_score_stmt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  INSERT INTO public.lead_icp_score_queue(lead_id, workspace_id)
  SELECT id, workspace_id FROM new_rows WHERE workspace_id IS NOT NULL
  ON CONFLICT (lead_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN PERFORM public.wake_lead_icp_scorer(); END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_enqueue_lead_icp_score AFTER INSERT ON public.leads
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_lead_icp_score_stmt();

CREATE OR REPLACE FUNCTION public.acquire_lead_icp_lock(_ttl_seconds int DEFAULT 140)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  UPDATE public.lead_icp_job_state SET locked_until = now() + make_interval(secs => _ttl_seconds), updated_at = now()
   WHERE key = 'global' AND (locked_until IS NULL OR locked_until < now())
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.release_lead_icp_lock()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.lead_icp_job_state SET locked_until = NULL, updated_at = now() WHERE key = 'global';
$$;

CREATE OR REPLACE FUNCTION public.claim_lead_icp_batch(_limit int DEFAULT 20)
RETURNS SETOF public.lead_icp_score_queue LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.lead_icp_score_queue q SET status = 'processing', attempts = attempts + 1, updated_at = now()
   WHERE q.lead_id IN (
     SELECT lead_id FROM public.lead_icp_score_queue p
      WHERE (p.status = 'pending' OR (p.status = 'processing' AND p.updated_at < now() - interval '10 minutes'))
        AND p.attempts < 5
        AND NOT EXISTS (SELECT 1 FROM public.lead_icp_job_state s WHERE s.workspace_id = p.workspace_id AND s.paused)
      ORDER BY p.created_at LIMIT _limit FOR UPDATE SKIP LOCKED)
  RETURNING q.*;
$$;

CREATE OR REPLACE FUNCTION public.requeue_lead_icp_score(_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws uuid;
BEGIN
  SELECT workspace_id INTO ws FROM public.leads WHERE id = _lead_id;
  IF ws IS NULL OR NOT (ws IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  INSERT INTO public.lead_icp_score_queue(lead_id, workspace_id) VALUES (_lead_id, ws)
  ON CONFLICT (lead_id) DO UPDATE SET status = 'pending', attempts = 0, last_error = NULL, updated_at = now();
  UPDATE public.leads SET icp_score_status = 'queued' WHERE id = _lead_id;
  PERFORM public.wake_lead_icp_scorer();
END $$;

CREATE OR REPLACE FUNCTION public.resume_lead_icp_scoring(_workspace_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (_workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  UPDATE public.lead_icp_job_state SET paused = false, pause_reason = NULL, updated_at = now() WHERE key = _workspace_id::text;
  PERFORM public.wake_lead_icp_scorer();
END $$;

REVOKE EXECUTE ON FUNCTION public.acquire_lead_icp_lock(int), public.release_lead_icp_lock(), public.claim_lead_icp_batch(int), public.wake_lead_icp_scorer() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_lead_icp_lock(int), public.release_lead_icp_lock(), public.claim_lead_icp_batch(int), public.wake_lead_icp_scorer() TO service_role;
REVOKE EXECUTE ON FUNCTION public.requeue_lead_icp_score(uuid), public.resume_lead_icp_scoring(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.requeue_lead_icp_score(uuid), public.resume_lead_icp_scoring(uuid) TO authenticated;

SELECT cron.schedule('score-leads-icp-backstop', '17 * * * *', $$
  SELECT public.wake_lead_icp_scorer() WHERE EXISTS (SELECT 1 FROM public.lead_icp_score_queue WHERE status IN ('pending','processing') AND attempts < 5);
$$);