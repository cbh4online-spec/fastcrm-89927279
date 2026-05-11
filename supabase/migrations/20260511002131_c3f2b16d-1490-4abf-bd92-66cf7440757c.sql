
-- Throttle settings por workspace (opcionalmente por instância)
CREATE TABLE public.whatsapp_throttle_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  instance_id UUID NULL,
  max_per_day INTEGER NOT NULL DEFAULT 300,
  min_interval_seconds INTEGER NOT NULL DEFAULT 8,
  max_interval_seconds INTEGER NOT NULL DEFAULT 25,
  error_pause_threshold NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  error_pause_window_minutes INTEGER NOT NULL DEFAULT 30,
  warmup_enabled BOOLEAN NOT NULL DEFAULT false,
  warmup_start_per_day INTEGER NOT NULL DEFAULT 30,
  warmup_increment_per_day INTEGER NOT NULL DEFAULT 20,
  warmup_started_at DATE NULL,
  paused BOOLEAN NOT NULL DEFAULT false,
  paused_reason TEXT NULL,
  paused_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, instance_id)
);

CREATE INDEX idx_wa_throttle_workspace ON public.whatsapp_throttle_settings(workspace_id);

ALTER TABLE public.whatsapp_throttle_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read throttle"
  ON public.whatsapp_throttle_settings FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "members write throttle"
  ON public.whatsapp_throttle_settings FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_wa_throttle_updated_at
  BEFORE UPDATE ON public.whatsapp_throttle_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contadores diários por instância
CREATE TABLE public.whatsapp_send_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  instance_id UUID NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  sent_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_send_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, instance_id, day)
);

CREATE INDEX idx_wa_counters_ws_day ON public.whatsapp_send_counters(workspace_id, day DESC);

ALTER TABLE public.whatsapp_send_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read counters"
  ON public.whatsapp_send_counters FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Apenas service_role escreve nos contadores

-- Função: status do throttle (permitido/aguardar)
CREATE OR REPLACE FUNCTION public.wa_get_throttle_status(
  _workspace_id UUID,
  _instance_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  c RECORD;
  effective_limit INTEGER;
  wait_seconds INTEGER := 0;
  allowed BOOLEAN := true;
  reason TEXT := NULL;
  days_since_warmup INTEGER;
BEGIN
  SELECT * INTO s FROM public.whatsapp_throttle_settings
   WHERE workspace_id = _workspace_id
     AND (instance_id = _instance_id OR (instance_id IS NULL AND _instance_id IS NULL))
   ORDER BY (instance_id = _instance_id) DESC NULLS LAST
   LIMIT 1;

  IF s IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true, 'configured', false, 'sent_today', 0,
      'limit', NULL, 'wait_seconds', 0
    );
  END IF;

  IF s.paused THEN
    RETURN jsonb_build_object(
      'allowed', false, 'configured', true, 'paused', true,
      'paused_reason', s.paused_reason, 'sent_today', 0,
      'limit', s.max_per_day, 'wait_seconds', 0
    );
  END IF;

  effective_limit := s.max_per_day;

  IF s.warmup_enabled AND s.warmup_started_at IS NOT NULL THEN
    days_since_warmup := GREATEST(0, (CURRENT_DATE - s.warmup_started_at)::INTEGER);
    effective_limit := LEAST(
      s.max_per_day,
      s.warmup_start_per_day + (days_since_warmup * s.warmup_increment_per_day)
    );
  END IF;

  SELECT * INTO c FROM public.whatsapp_send_counters
   WHERE workspace_id = _workspace_id
     AND (instance_id IS NOT DISTINCT FROM _instance_id)
     AND day = CURRENT_DATE
   LIMIT 1;

  IF c.sent_count >= effective_limit THEN
    allowed := false;
    reason := 'daily_limit_reached';
  ELSIF c.last_send_at IS NOT NULL THEN
    wait_seconds := GREATEST(0, s.min_interval_seconds - EXTRACT(EPOCH FROM (now() - c.last_send_at))::INTEGER);
    IF wait_seconds > 0 THEN
      allowed := false;
      reason := 'min_interval';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', allowed,
    'configured', true,
    'paused', false,
    'sent_today', COALESCE(c.sent_count, 0),
    'error_today', COALESCE(c.error_count, 0),
    'limit', effective_limit,
    'absolute_limit', s.max_per_day,
    'min_interval', s.min_interval_seconds,
    'max_interval', s.max_interval_seconds,
    'wait_seconds', wait_seconds,
    'reason', reason,
    'warmup_enabled', s.warmup_enabled,
    'warmup_day', CASE WHEN s.warmup_started_at IS NOT NULL
                       THEN GREATEST(0, (CURRENT_DATE - s.warmup_started_at)::INTEGER) + 1
                       ELSE NULL END
  );
END;
$$;

-- Função: regista um envio (chamado pelo backend após envio)
CREATE OR REPLACE FUNCTION public.wa_register_send(
  _workspace_id UUID,
  _instance_id UUID DEFAULT NULL,
  _is_error BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whatsapp_send_counters (workspace_id, instance_id, day, sent_count, error_count, last_send_at, updated_at)
  VALUES (_workspace_id, _instance_id, CURRENT_DATE,
          CASE WHEN _is_error THEN 0 ELSE 1 END,
          CASE WHEN _is_error THEN 1 ELSE 0 END,
          now(), now())
  ON CONFLICT (workspace_id, instance_id, day) DO UPDATE
    SET sent_count = whatsapp_send_counters.sent_count + (CASE WHEN _is_error THEN 0 ELSE 1 END),
        error_count = whatsapp_send_counters.error_count + (CASE WHEN _is_error THEN 1 ELSE 0 END),
        last_send_at = CASE WHEN _is_error THEN whatsapp_send_counters.last_send_at ELSE now() END,
        updated_at = now();
END;
$$;

-- Função: avalia taxa de erro e pausa automaticamente se acima do limiar
CREATE OR REPLACE FUNCTION public.wa_evaluate_auto_pause(_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  total INTEGER;
  errors INTEGER;
  rate NUMERIC;
  paused_count INTEGER := 0;
BEGIN
  FOR s IN SELECT * FROM public.whatsapp_throttle_settings WHERE workspace_id = _workspace_id AND NOT paused LOOP
    SELECT COALESCE(SUM(sent_count + error_count), 0), COALESCE(SUM(error_count), 0)
      INTO total, errors
      FROM public.whatsapp_send_counters
     WHERE workspace_id = s.workspace_id
       AND (instance_id IS NOT DISTINCT FROM s.instance_id)
       AND updated_at >= now() - (s.error_pause_window_minutes || ' minutes')::interval;

    IF total >= 10 THEN
      rate := (errors::NUMERIC / total::NUMERIC) * 100;
      IF rate >= s.error_pause_threshold THEN
        UPDATE public.whatsapp_throttle_settings
           SET paused = true,
               paused_reason = 'auto: taxa de erro ' || rate::text || '% nos últimos ' || s.error_pause_window_minutes || ' min',
               paused_at = now()
         WHERE id = s.id;
        paused_count := paused_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('paused', paused_count);
END;
$$;
