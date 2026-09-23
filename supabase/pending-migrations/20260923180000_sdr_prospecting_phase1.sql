-- ============================================================================
-- FastCRM Prospecção — Fase 1 (motor SDR)
-- ESTADO: PENDENTE. NÃO APLICADA EM PRODUÇÃO.
-- Aplicar só após revisão explícita (ver docs/fastcrm-prospecting-phase1.md).
--
-- Totalmente aditiva: não apaga colunas, tabelas nem históricos.
-- Duplicados preexistentes em sdr_enrollments NÃO fazem falhar a migração:
-- apenas a inscrição mais antiga por (campanha, identidade) recebe identity_key;
-- as restantes ficam marcadas em metadata.sdr_duplicate_of para revisão manual.
-- Todos os novos percursos autónomos ficam DESLIGADOS por defeito.
-- ============================================================================

-- ─── 1. Normalização de identidade (espelhada em _shared/sdr-engine/identity.ts)
CREATE OR REPLACE FUNCTION public.sdr_normalize_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN d = '' THEN NULL
    WHEN left(d, 2) = '00' THEN substr(d, 3)
    WHEN length(d) = 9 AND left(d, 1) IN ('2', '3', '9') THEN '351' || d
    ELSE d END
  FROM (SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g') AS d) s
$$;

CREATE OR REPLACE FUNCTION public.sdr_identity_key(
  p_email text, p_phone text, p_contact_id uuid, p_lead_id uuid, p_prospect_id uuid
) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(
    CASE WHEN lower(btrim(coalesce(p_email, ''))) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
         THEN 'email:' || lower(btrim(p_email)) END,
    CASE WHEN length(coalesce(public.sdr_normalize_phone(p_phone), '')) >= 9
         THEN 'phone:' || public.sdr_normalize_phone(p_phone) END,
    'contact:' || p_contact_id::text,
    'lead:' || p_lead_id::text,
    'prospect:' || p_prospect_id::text
  )
$$;

-- ─── 2. Campanhas: controlos explícitos (todos desligados / nulos por defeito)
ALTER TABLE public.sdr_campaigns
  ADD COLUMN IF NOT EXISTS autonomous_send_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_connection_id uuid REFERENCES public.email_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_instance_id uuid,
  ADD COLUMN IF NOT EXISTS email_daily_limit integer CHECK (email_daily_limit IS NULL OR email_daily_limit BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS email_min_interval_seconds integer CHECK (email_min_interval_seconds IS NULL OR email_min_interval_seconds >= 30);

COMMENT ON COLUMN public.sdr_campaigns.autonomous_send_enabled IS
  'Fase 1: envio autónomo só ocorre se TRUE e se o secret SDR_AUTONOMOUS_SEND_ENABLED=true. Default false.';

-- ─── 3. Inscrições: identidade estável, conversa e estados em falta
ALTER TABLE public.sdr_enrollments
  ADD COLUMN IF NOT EXISTS identity_key text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- O CHECK original não incluía 'paused' nem 'completed', que o código já usava.
-- Substituído por um superconjunto (nenhuma linha existente passa a ser inválida).
ALTER TABLE public.sdr_enrollments DROP CONSTRAINT IF EXISTS sdr_enrollments_status_check;
ALTER TABLE public.sdr_enrollments ADD CONSTRAINT sdr_enrollments_status_check CHECK (status = ANY (ARRAY[
  'enrolled','enriching','sequenced','paused','replied','positive_reply','meeting_set',
  'converted','opted_out','failed','completed','blocked'
]::text[]));

-- Backfill: só a inscrição mais antiga por (campanha, identidade) recebe a chave.
WITH ranked AS (
  SELECT id, campaign_id,
         public.sdr_identity_key(prospect_email, prospect_phone, contact_id, lead_id, prospect_id) AS k,
         row_number() OVER (
           PARTITION BY campaign_id, public.sdr_identity_key(prospect_email, prospect_phone, contact_id, lead_id, prospect_id)
           ORDER BY created_at, id) AS rn,
         first_value(id) OVER (
           PARTITION BY campaign_id, public.sdr_identity_key(prospect_email, prospect_phone, contact_id, lead_id, prospect_id)
           ORDER BY created_at, id) AS keeper
  FROM public.sdr_enrollments
  WHERE identity_key IS NULL AND NOT (coalesce(metadata, '{}'::jsonb) ? 'sdr_duplicate_of')
)
UPDATE public.sdr_enrollments e
SET identity_key = CASE WHEN r.rn = 1 AND x.id IS NULL THEN r.k ELSE NULL END,
    metadata = CASE WHEN r.rn = 1 AND x.id IS NULL THEN e.metadata
                    ELSE coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object('sdr_duplicate_of', coalesce(x.id, r.keeper)) END
FROM ranked r
LEFT JOIN public.sdr_enrollments x ON x.campaign_id = r.campaign_id AND x.identity_key = r.k
WHERE e.id = r.id AND r.k IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sdr_enrollments_campaign_identity
  ON public.sdr_enrollments (campaign_id, identity_key) WHERE identity_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sdr_enrollments_ws_active
  ON public.sdr_enrollments (workspace_id, status) WHERE status IN ('enrolled','sequenced','paused');

-- ─── 4. Tentativas por etapa (idempotência + estados de aceitação/entrega)
CREATE TABLE IF NOT EXISTS public.sdr_step_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.sdr_enrollments(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.sdr_campaigns(id) ON DELETE CASCADE,
  step_id uuid,
  step_order integer NOT NULL,
  channel text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN (
    'reserved','dispatching','accepted','delivered','failed_retryable','failed_final',
    'ambiguous','blocked','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 5),
  lease_expires_at timestamptz,
  next_retry_at timestamptz,
  account_key text,
  provider_message_id text,
  last_error text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sdr_step_attempts TO authenticated;
GRANT ALL ON public.sdr_step_attempts TO service_role;
ALTER TABLE public.sdr_step_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros leem tentativas SDR do workspace" ON public.sdr_step_attempts;
CREATE POLICY "Membros leem tentativas SDR do workspace" ON public.sdr_step_attempts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_sdr_step_attempts_enrollment ON public.sdr_step_attempts (enrollment_id, step_order);

-- ─── 5. Reservas de quota partilhada (workspace + canal + conta)
CREATE TABLE IF NOT EXISTS public.sdr_send_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel text NOT NULL,
  account_key text NOT NULL,
  local_day date NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  attempt_id uuid NOT NULL UNIQUE REFERENCES public.sdr_step_attempts(id) ON DELETE CASCADE,
  released boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.sdr_send_reservations TO authenticated;
GRANT ALL ON public.sdr_send_reservations TO service_role;
ALTER TABLE public.sdr_send_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros leem reservas SDR do workspace" ON public.sdr_send_reservations;
CREATE POLICY "Membros leem reservas SDR do workspace" ON public.sdr_send_reservations
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_sdr_send_reservations_bucket
  ON public.sdr_send_reservations (workspace_id, channel, account_key, local_day);

-- ─── 6. Claim atómico da etapa
CREATE OR REPLACE FUNCTION public.sdr_claim_step_attempt(
  p_workspace_id uuid, p_enrollment_id uuid, p_campaign_id uuid, p_step_id uuid,
  p_step_order integer, p_channel text, p_lease_seconds integer DEFAULT 300
) RETURNS TABLE (attempt_id uuid, attempt_status text, attempt_count integer, claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key text := p_enrollment_id::text || ':' || p_step_order::text || ':' || coalesce(p_step_id::text, '-');
  r public.sdr_step_attempts%ROWTYPE;
BEGIN
  -- Pertença: a inscrição tem de ser deste workspace e desta campanha.
  PERFORM 1 FROM public.sdr_enrollments
   WHERE id = p_enrollment_id AND workspace_id = p_workspace_id AND campaign_id = p_campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sdr_enrollment_workspace_mismatch'; END IF;

  INSERT INTO public.sdr_step_attempts (workspace_id, enrollment_id, campaign_id, step_id, step_order, channel, idempotency_key)
  VALUES (p_workspace_id, p_enrollment_id, p_campaign_id, p_step_id, p_step_order, p_channel, v_key)
  ON CONFLICT (idempotency_key) DO NOTHING;

  SELECT * INTO r FROM public.sdr_step_attempts WHERE idempotency_key = v_key FOR UPDATE;

  IF r.workspace_id <> p_workspace_id THEN RAISE EXCEPTION 'sdr_attempt_workspace_mismatch'; END IF;

  -- Envio em curso cujo lease expirou: resultado no fornecedor é desconhecido → nunca reenviar.
  IF r.status = 'dispatching' AND r.lease_expires_at < now() THEN
    UPDATE public.sdr_step_attempts SET status = 'ambiguous', last_error = 'lease_expired_during_dispatch', updated_at = now()
     WHERE id = r.id;
    RETURN QUERY SELECT r.id, 'ambiguous'::text, r.attempt_count, false; RETURN;
  END IF;

  IF r.status IN ('reserved', 'failed_retryable')
     AND (r.lease_expires_at IS NULL OR r.lease_expires_at < now())
     AND (r.next_retry_at IS NULL OR r.next_retry_at <= now())
     AND r.attempt_count < r.max_attempts THEN
    UPDATE public.sdr_step_attempts
       SET status = 'reserved', lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
     WHERE id = r.id;
    RETURN QUERY SELECT r.id, 'reserved'::text, r.attempt_count, true; RETURN;
  END IF;

  RETURN QUERY SELECT r.id, r.status, r.attempt_count, false;
END $$;

-- Passa de reserved → dispatching (imediatamente antes da chamada ao transporte).
CREATE OR REPLACE FUNCTION public.sdr_begin_dispatch(p_attempt_id uuid, p_account_key text, p_lease_seconds integer DEFAULT 120)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sdr_step_attempts
     SET status = 'dispatching', attempt_count = attempt_count + 1, account_key = p_account_key,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
   WHERE id = p_attempt_id AND status = 'reserved' AND lease_expires_at > now();
  RETURN FOUND;
END $$;

-- ─── 7. Reserva atómica de quota diária + intervalo mínimo (Europe/Lisbon)
CREATE OR REPLACE FUNCTION public.sdr_reserve_send_slot(
  p_workspace_id uuid, p_channel text, p_account_key text, p_attempt_id uuid,
  p_max_per_day integer, p_min_interval_seconds integer, p_timezone text DEFAULT 'Europe/Lisbon'
) RETURNS TABLE (allowed boolean, reason text, retry_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day date := (now() AT TIME ZONE p_timezone)::date;
  v_count integer;
  v_last timestamptz;
BEGIN
  IF p_max_per_day IS NULL OR p_max_per_day < 1 OR p_min_interval_seconds IS NULL THEN
    RETURN QUERY SELECT false, 'quota_not_configured'::text, NULL::timestamptz; RETURN;
  END IF;
  PERFORM 1 FROM public.sdr_step_attempts WHERE id = p_attempt_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sdr_attempt_workspace_mismatch'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || '|' || p_channel || '|' || p_account_key, 0));

  IF EXISTS (SELECT 1 FROM public.sdr_send_reservations WHERE attempt_id = p_attempt_id AND NOT released) THEN
    RETURN QUERY SELECT true, 'already_reserved'::text, NULL::timestamptz; RETURN;
  END IF;

  SELECT count(*), max(reserved_at) INTO v_count, v_last
    FROM public.sdr_send_reservations
   WHERE workspace_id = p_workspace_id AND channel = p_channel AND account_key = p_account_key
     AND local_day = v_day AND NOT released;

  IF v_count >= p_max_per_day THEN
    RETURN QUERY SELECT false, 'daily_limit'::text, ((v_day + 1)::timestamp AT TIME ZONE p_timezone); RETURN;
  END IF;

  -- Intervalo verificado sobre todas as reservas (incluindo as do dia anterior).
  SELECT max(reserved_at) INTO v_last FROM public.sdr_send_reservations
   WHERE workspace_id = p_workspace_id AND channel = p_channel AND account_key = p_account_key AND NOT released;
  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => p_min_interval_seconds) THEN
    RETURN QUERY SELECT false, 'min_interval'::text, v_last + make_interval(secs => p_min_interval_seconds); RETURN;
  END IF;

  INSERT INTO public.sdr_send_reservations (workspace_id, channel, account_key, local_day, attempt_id)
  VALUES (p_workspace_id, p_channel, p_account_key, v_day, p_attempt_id);
  RETURN QUERY SELECT true, 'reserved'::text, NULL::timestamptz;
END $$;

-- ─── 8. Paragem por resposta (correlação dentro do mesmo workspace)
CREATE OR REPLACE FUNCTION public.sdr_stop_enrollments_on_inbound(
  p_workspace_id uuid, p_conversation_id uuid, p_email text, p_phone text,
  p_lead_id uuid, p_contact_id uuid, p_at timestamptz DEFAULT now()
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email_key text := CASE WHEN p_email IS NULL THEN NULL ELSE public.sdr_identity_key(p_email, NULL, NULL, NULL, NULL) END;
  v_phone_key text := CASE WHEN length(coalesce(public.sdr_normalize_phone(p_phone), '')) >= 9
                           THEN 'phone:' || public.sdr_normalize_phone(p_phone) END;
  v_ids uuid[];
BEGIN
  WITH stopped AS (
    UPDATE public.sdr_enrollments e
       SET status = 'replied', reply_detected_at = p_at, next_send_at = NULL, updated_at = now()
     WHERE e.workspace_id = p_workspace_id
       AND e.status IN ('enrolled', 'sequenced', 'paused')
       AND e.created_at <= p_at
       AND ((p_conversation_id IS NOT NULL AND e.conversation_id = p_conversation_id)
         OR (p_lead_id IS NOT NULL AND e.lead_id = p_lead_id)
         OR (p_contact_id IS NOT NULL AND e.contact_id = p_contact_id)
         OR (v_email_key IS NOT NULL AND (e.identity_key = v_email_key OR lower(e.prospect_email) = lower(btrim(p_email))))
         OR (v_phone_key IS NOT NULL AND (e.identity_key = v_phone_key OR public.sdr_normalize_phone(e.prospect_phone) = public.sdr_normalize_phone(p_phone))))
    RETURNING e.id
  ) SELECT array_agg(id) INTO v_ids FROM stopped;

  IF v_ids IS NULL THEN RETURN 0; END IF;

  UPDATE public.sdr_step_attempts SET status = 'cancelled', last_error = 'reply_detected', updated_at = now()
   WHERE enrollment_id = ANY (v_ids) AND status IN ('reserved', 'failed_retryable');
  RETURN coalesce(array_length(v_ids, 1), 0);
END $$;

CREATE OR REPLACE FUNCTION public.sdr_on_inbound_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; v_email text; v_phone text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sdr_enrollments
                  WHERE workspace_id = NEW.workspace_id AND status IN ('enrolled','sequenced','paused')) THEN
    RETURN NEW;
  END IF;
  SELECT id, channel, external_thread_id, lead_id, contact_id INTO c
    FROM public.conversations WHERE id = NEW.conversation_id AND workspace_id = NEW.workspace_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF c.lead_id IS NOT NULL THEN
    SELECT email, phone INTO v_email, v_phone FROM public.leads WHERE id = c.lead_id AND workspace_id = NEW.workspace_id;
  END IF;
  IF v_email IS NULL AND v_phone IS NULL AND c.contact_id IS NOT NULL THEN
    SELECT email, phone INTO v_email, v_phone FROM public.contacts WHERE id = c.contact_id AND workspace_id = NEW.workspace_id;
  END IF;
  IF c.channel = 'whatsapp' AND v_phone IS NULL THEN v_phone := c.external_thread_id; END IF;
  PERFORM public.sdr_stop_enrollments_on_inbound(NEW.workspace_id, c.id, v_email, v_phone, c.lead_id, c.contact_id,
                                                 coalesce(NEW.created_at, now()));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sdr_on_inbound_message: %', SQLERRM;  -- nunca bloqueia a ingestão
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sdr_stop_on_inbound ON public.messages;
CREATE TRIGGER trg_sdr_stop_on_inbound
  AFTER INSERT ON public.messages
  FOR EACH ROW WHEN (NEW.direction = 'inbound')
  EXECUTE FUNCTION public.sdr_on_inbound_message();

-- ─── 9. Exclusão (token existente) propaga para inscrições SDR
CREATE OR REPLACE FUNCTION public.sdr_apply_email_optout(p_email text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids uuid[];
BEGIN
  WITH o AS (
    UPDATE public.sdr_enrollments
       SET status = 'opted_out', opted_out_at = now(), next_send_at = NULL, updated_at = now()
     WHERE lower(prospect_email) = lower(btrim(p_email))
       AND status IN ('enrolled','sequenced','paused')
    RETURNING id, workspace_id
  ), s AS (
    INSERT INTO public.sdr_suppressions (workspace_id, email, reason, source_enrollment_id)
    SELECT DISTINCT ON (workspace_id) workspace_id, lower(btrim(p_email)), 'unsubscribe_link', id FROM o
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT array_agg(id) INTO v_ids FROM o;
  IF v_ids IS NULL THEN RETURN 0; END IF;
  UPDATE public.sdr_step_attempts SET status = 'cancelled', last_error = 'opted_out', updated_at = now()
   WHERE enrollment_id = ANY (v_ids) AND status IN ('reserved', 'failed_retryable');
  RETURN array_length(v_ids, 1);
END $$;

-- ─── 10. Execução restrita ao service_role
REVOKE ALL ON FUNCTION public.sdr_claim_step_attempt(uuid,uuid,uuid,uuid,integer,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_begin_dispatch(uuid,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_reserve_send_slot(uuid,text,text,uuid,integer,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_stop_enrollments_on_inbound(uuid,uuid,text,text,uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_apply_email_optout(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_on_inbound_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_claim_step_attempt(uuid,uuid,uuid,uuid,integer,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_begin_dispatch(uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_reserve_send_slot(uuid,text,text,uuid,integer,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_stop_enrollments_on_inbound(uuid,uuid,text,text,uuid,uuid,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_apply_email_optout(text) TO service_role;
