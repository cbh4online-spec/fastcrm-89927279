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

-- Compatibilização de estados (confirmada por SELECT no esquema real):
-- o CHECK em produção admite apenas
--   enrolled, enriching, sequenced, replied, positive_reply, meeting_set,
--   converted, opted_out, failed
-- mas o código do motor usa também 'paused', 'completed' e 'blocked'.
-- Substituição por um SUPERCONJUNTO estrito: nenhuma linha existente passa a
-- ser inválida e nenhum estado antigo é removido. Enquanto esta migração não
-- for aplicada, o executor devolve schema_not_ready e nunca escreve estes
-- estados (fail-closed) — ver detectPhase1Schema em _shared/sdr-engine.
DO $do$
DECLARE v_def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public' AND t.relname = 'sdr_enrollments'
     AND c.conname = 'sdr_enrollments_status_check';

  IF v_def IS NULL
     OR v_def NOT LIKE '%paused%'
     OR v_def NOT LIKE '%completed%'
     OR v_def NOT LIKE '%blocked%' THEN
    -- Sanidade: nunca aplicar se existir algum estado fora do superconjunto.
    IF EXISTS (
      SELECT 1 FROM public.sdr_enrollments
       WHERE status IS NOT NULL AND status <> ALL (ARRAY[
         'enrolled','enriching','sequenced','paused','replied','positive_reply',
         'meeting_set','converted','opted_out','failed','completed','blocked']::text[])
    ) THEN
      RAISE EXCEPTION 'sdr_enrollments contém estados fora do superconjunto previsto; revisão manual necessária';
    END IF;

    ALTER TABLE public.sdr_enrollments DROP CONSTRAINT IF EXISTS sdr_enrollments_status_check;
    ALTER TABLE public.sdr_enrollments ADD CONSTRAINT sdr_enrollments_status_check CHECK (status = ANY (ARRAY[
      'enrolled','enriching','sequenced','paused','replied','positive_reply','meeting_set',
      'converted','opted_out','failed','completed','blocked'
    ]::text[]));
  END IF;
END $do$;


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
  attempt_id uuid NOT NULL REFERENCES public.sdr_step_attempts(id) ON DELETE CASCADE,
  -- Uma reserva por DESPACHO (attempt_count + 1), não por tentativa lógica:
  -- um retry noutro dia exige nova reserva validada contra a quota desse dia.
  dispatch_no integer NOT NULL DEFAULT 1 CHECK (dispatch_no BETWEEN 1 AND 5),
  consumed_at timestamptz,
  released boolean NOT NULL DEFAULT false,
  CONSTRAINT uq_sdr_send_reservations_dispatch UNIQUE (attempt_id, dispatch_no)
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

-- ─── 7. Reserva atómica de quota diária + intervalo mínimo (Europe/Lisbon)
-- Chave: (tentativa, número de despacho). Regras:
--  * mesma tentativa + mesmo despacho + mesmo dia local + ainda não consumida → already_reserved;
--  * reserva de outro dia ainda não consumida → libertada e revalidada contra a quota de HOJE;
--  * despacho já consumido → nunca reutilizado (retry exige despacho seguinte);
--  * quota e intervalo contam todas as reservas não libertadas (consumidas ou não),
--    pelo que envios rejeitados pelo fornecedor continuam a contar (nunca aumenta limites).
CREATE OR REPLACE FUNCTION public.sdr_reserve_send_slot(
  p_workspace_id uuid, p_channel text, p_account_key text, p_attempt_id uuid, p_dispatch_no integer,
  p_max_per_day integer, p_min_interval_seconds integer, p_timezone text DEFAULT 'Europe/Lisbon'
) RETURNS TABLE (allowed boolean, reason text, retry_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day date;
  v_count integer;
  v_last timestamptz;
  a public.sdr_step_attempts%ROWTYPE;
  res public.sdr_send_reservations%ROWTYPE;
BEGIN
  IF p_max_per_day IS NULL OR p_max_per_day < 1 OR p_min_interval_seconds IS NULL OR p_min_interval_seconds < 0 THEN
    RETURN QUERY SELECT false, 'quota_not_configured'::text, NULL::timestamptz; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RETURN QUERY SELECT false, 'invalid_timezone'::text, NULL::timestamptz; RETURN;
  END IF;
  v_day := (now() AT TIME ZONE p_timezone)::date;

  SELECT * INTO a FROM public.sdr_step_attempts WHERE id = p_attempt_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sdr_attempt_workspace_mismatch'; END IF;
  IF a.channel <> p_channel THEN RAISE EXCEPTION 'sdr_attempt_channel_mismatch'; END IF;
  IF a.status <> 'reserved' OR p_dispatch_no <> a.attempt_count + 1 THEN
    RETURN QUERY SELECT false, 'attempt_not_reservable'::text, NULL::timestamptz; RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::text || '|' || p_channel || '|' || p_account_key, 0));

  SELECT * INTO res FROM public.sdr_send_reservations
   WHERE attempt_id = p_attempt_id AND dispatch_no = p_dispatch_no AND NOT released;
  IF FOUND THEN
    IF res.consumed_at IS NOT NULL THEN
      RETURN QUERY SELECT false, 'dispatch_already_consumed'::text, NULL::timestamptz; RETURN;
    END IF;
    IF res.local_day = v_day AND res.account_key = p_account_key THEN
      RETURN QUERY SELECT true, 'already_reserved'::text, NULL::timestamptz; RETURN;
    END IF;
    -- Reserva de outro dia (ou outra conta) nunca usada: liberta e revalida hoje.
    UPDATE public.sdr_send_reservations SET released = true WHERE id = res.id;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.sdr_send_reservations
   WHERE workspace_id = p_workspace_id AND channel = p_channel AND account_key = p_account_key
     AND local_day = v_day AND NOT released;
  IF v_count >= p_max_per_day THEN
    RETURN QUERY SELECT false, 'daily_limit'::text, ((v_day + 1)::timestamp AT TIME ZONE p_timezone); RETURN;
  END IF;

  SELECT max(reserved_at) INTO v_last FROM public.sdr_send_reservations
   WHERE workspace_id = p_workspace_id AND channel = p_channel AND account_key = p_account_key AND NOT released;
  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => p_min_interval_seconds) THEN
    RETURN QUERY SELECT false, 'min_interval'::text, v_last + make_interval(secs => p_min_interval_seconds); RETURN;
  END IF;

  INSERT INTO public.sdr_send_reservations (workspace_id, channel, account_key, local_day, attempt_id, dispatch_no)
  VALUES (p_workspace_id, p_channel, p_account_key, v_day, p_attempt_id, p_dispatch_no)
  ON CONFLICT (attempt_id, dispatch_no) DO UPDATE
     SET workspace_id = EXCLUDED.workspace_id, channel = EXCLUDED.channel, account_key = EXCLUDED.account_key,
         local_day = EXCLUDED.local_day, reserved_at = now(), released = false, consumed_at = NULL;
  RETURN QUERY SELECT true, 'reserved'::text, NULL::timestamptz;
END $$;

-- ─── 7b. Elegibilidade no ponto transaccional (usada por begin_dispatch e pelos transportes)
CREATE OR REPLACE FUNCTION public.sdr_dispatch_ineligibility(p_enrollment_id uuid, p_channel text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; c record; v_seq_status text; v_phone text; l record; k record;
BEGIN
  SELECT * INTO e FROM public.sdr_enrollments WHERE id = p_enrollment_id;
  IF NOT FOUND THEN RETURN 'enrollment_missing'; END IF;
  IF e.status <> 'sequenced' THEN RETURN 'enrollment_' || e.status; END IF;
  SELECT id, workspace_id, status, sequence_id, autonomous_send_enabled INTO c
    FROM public.sdr_campaigns WHERE id = e.campaign_id AND workspace_id = e.workspace_id;
  IF NOT FOUND THEN RETURN 'campaign_missing'; END IF;
  IF c.status IS DISTINCT FROM 'active' THEN RETURN 'campaign_inactive'; END IF;
  IF c.autonomous_send_enabled IS NOT TRUE THEN RETURN 'campaign_autonomous_disabled'; END IF;
  IF c.sequence_id IS NULL THEN RETURN 'campaign_without_sequence'; END IF;
  SELECT status INTO v_seq_status FROM public.multichannel_sequences WHERE id = c.sequence_id AND workspace_id = e.workspace_id;
  IF v_seq_status IS DISTINCT FROM 'active' THEN RETURN 'sequence_inactive'; END IF;

  IF e.prospect_email IS NOT NULL AND (
       EXISTS (SELECT 1 FROM public.sdr_suppressions s WHERE s.workspace_id = e.workspace_id AND lower(s.email) = lower(btrim(e.prospect_email)))
    OR EXISTS (SELECT 1 FROM public.suppressed_emails s WHERE lower(s.email) = lower(btrim(e.prospect_email)))) THEN
    RETURN 'suppressed';
  END IF;

  IF e.lead_id IS NOT NULL THEN
    SELECT is_blocked, archived_at, automation_active INTO l FROM public.leads WHERE id = e.lead_id AND workspace_id = e.workspace_id;
    IF NOT FOUND THEN RETURN 'lead_not_in_workspace'; END IF;
    IF l.is_blocked OR l.archived_at IS NOT NULL THEN RETURN 'contact_blocked'; END IF;
    IF l.automation_active IS FALSE THEN RETURN 'automation_paused'; END IF;
  END IF;
  IF e.contact_id IS NOT NULL THEN
    SELECT is_blocked, archived_at, deleted_at, automation_active INTO k FROM public.contacts WHERE id = e.contact_id AND workspace_id = e.workspace_id;
    IF NOT FOUND THEN RETURN 'contact_not_in_workspace'; END IF;
    IF k.is_blocked OR k.archived_at IS NOT NULL OR k.deleted_at IS NOT NULL THEN RETURN 'contact_blocked'; END IF;
    IF k.automation_active IS FALSE THEN RETURN 'automation_paused'; END IF;
  END IF;

  IF p_channel = 'whatsapp' THEN
    v_phone := public.sdr_normalize_phone(e.prospect_phone);
    IF v_phone IS NULL OR length(v_phone) < 9 THEN RETURN 'no_phone'; END IF;
    IF EXISTS (SELECT 1 FROM public.whatsapp_optouts o WHERE o.workspace_id = e.workspace_id
                AND public.sdr_normalize_phone(o.phone) = v_phone) THEN
      RETURN 'suppressed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_consents w WHERE w.workspace_id = e.workspace_id
                    AND public.sdr_normalize_phone(w.phone) = v_phone
                    AND w.status = 'granted' AND w.revoked_at IS NULL
                    AND w.consent_category IN ('marketing', 'all')) THEN
      RETURN 'whatsapp_consent_missing';
    END IF;
  END IF;
  RETURN NULL;
END $$;

-- Passa de reserved → dispatching IMEDIATAMENTE antes do transporte, na mesma
-- transacção que revalida inscrição/etapa/campanha/sequência/exclusão/consentimento
-- e consome a reserva de quota do dia. Devolve 'ok' ou o motivo de recusa.
CREATE OR REPLACE FUNCTION public.sdr_begin_dispatch(
  p_attempt_id uuid, p_account_key text, p_expected_step integer,
  p_lease_seconds integer DEFAULT 120, p_timezone text DEFAULT 'Europe/Lisbon'
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.sdr_step_attempts%ROWTYPE; e record; v_reason text; v_res uuid;
BEGIN
  SELECT * INTO a FROM public.sdr_step_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR a.status <> 'reserved' OR a.lease_expires_at IS NULL OR a.lease_expires_at <= now() THEN
    RETURN 'lease_lost';
  END IF;
  -- Bloqueia a inscrição: pausas/respostas concorrentes esperam ou são vistas aqui.
  SELECT * INTO e FROM public.sdr_enrollments WHERE id = a.enrollment_id AND workspace_id = a.workspace_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'enrollment_missing'; END IF;
  IF coalesce(e.current_step, 0) <> p_expected_step THEN RETURN 'step_changed'; END IF;
  PERFORM 1 FROM public.sdr_campaigns WHERE id = a.campaign_id FOR SHARE;
  IF a.step_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.multichannel_sequence_steps s
         JOIN public.sdr_campaigns c ON c.id = a.campaign_id AND c.sequence_id = s.sequence_id
        WHERE s.id = a.step_id AND s.is_active) THEN
    RETURN 'step_inactive';
  END IF;
  v_reason := public.sdr_dispatch_ineligibility(a.enrollment_id, a.channel);
  IF v_reason IS NOT NULL THEN RETURN v_reason; END IF;

  UPDATE public.sdr_send_reservations
     SET consumed_at = now()
   WHERE attempt_id = a.id AND dispatch_no = a.attempt_count + 1 AND account_key = p_account_key
     AND NOT released AND consumed_at IS NULL AND local_day = (now() AT TIME ZONE p_timezone)::date
  RETURNING id INTO v_res;
  IF v_res IS NULL THEN RETURN 'quota_reservation_missing'; END IF;

  UPDATE public.sdr_step_attempts
     SET status = 'dispatching', attempt_count = attempt_count + 1, account_key = p_account_key,
         lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
   WHERE id = a.id;
  RETURN 'ok';
END $$;

-- Fecho de tentativa com transição verificada. Falha (false) se o estado actual
-- não for o esperado — o chamador nunca avança a sequência sem persistir.
-- Reservas não consumidas são libertadas quando a tentativa é cancelada/bloqueada.
CREATE OR REPLACE FUNCTION public.sdr_finish_attempt(
  p_attempt_id uuid, p_from text[], p_status text,
  p_provider_message_id text DEFAULT NULL, p_last_error text DEFAULT NULL, p_next_retry_at timestamptz DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sdr_step_attempts
     SET status = p_status, lease_expires_at = NULL, updated_at = now(),
         provider_message_id = coalesce(p_provider_message_id, provider_message_id),
         last_error = p_last_error, next_retry_at = p_next_retry_at,
         accepted_at = CASE WHEN p_status = 'accepted' THEN now() ELSE accepted_at END
   WHERE id = p_attempt_id AND status = ANY (p_from);
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_status IN ('cancelled', 'blocked') THEN
    UPDATE public.sdr_send_reservations SET released = true
     WHERE attempt_id = p_attempt_id AND consumed_at IS NULL AND NOT released;
  END IF;
  RETURN true;
END $$;

-- ─── 7c. Fronteira de envio: consumo atómico e único por despacho/etapa do transporte
-- A assinatura HMAC só prova origem; ESTE registo impede o replay do mesmo pedido
-- assinado (cada transporte aceita um despacho uma única vez) e vincula o pedido
-- a tentativa/etapa/campanha/workspace/destinatário/canal em estado 'dispatching'.
CREATE TABLE IF NOT EXISTS public.sdr_transport_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.sdr_step_attempts(id) ON DELETE CASCADE,
  dispatch_no integer NOT NULL,
  stage text NOT NULL CHECK (stage IN ('email-send', 'whatsapp-pro-send', 'whatsapp-zapi-send')),
  recipient text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_sdr_transport_receipts UNIQUE (attempt_id, dispatch_no, stage)
);
GRANT SELECT ON public.sdr_transport_receipts TO authenticated;
GRANT ALL ON public.sdr_transport_receipts TO service_role;
ALTER TABLE public.sdr_transport_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros leem recibos SDR do workspace" ON public.sdr_transport_receipts;
CREATE POLICY "Membros leem recibos SDR do workspace" ON public.sdr_transport_receipts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.sdr_consume_transport_token(
  p_workspace_id uuid, p_attempt_id uuid, p_dispatch_no integer, p_stage text, p_channel text, p_recipient text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.sdr_step_attempts%ROWTYPE; e record; v_reason text; v_rcpt text;
BEGIN
  SELECT * INTO a FROM public.sdr_step_attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'attempt_missing'; END IF;
  IF a.workspace_id <> p_workspace_id THEN RETURN 'workspace_mismatch'; END IF;
  IF a.channel <> p_channel THEN RETURN 'channel_mismatch'; END IF;
  IF a.status <> 'dispatching' OR a.lease_expires_at IS NULL OR a.lease_expires_at <= now() THEN RETURN 'attempt_not_dispatching'; END IF;
  IF a.attempt_count <> p_dispatch_no THEN RETURN 'dispatch_mismatch'; END IF;
  SELECT prospect_email, prospect_phone INTO e FROM public.sdr_enrollments
   WHERE id = a.enrollment_id AND workspace_id = a.workspace_id AND campaign_id = a.campaign_id;
  IF NOT FOUND THEN RETURN 'enrollment_mismatch'; END IF;
  IF p_channel = 'email' THEN
    v_rcpt := lower(btrim(coalesce(p_recipient, '')));
    IF v_rcpt = '' OR v_rcpt <> lower(btrim(coalesce(e.prospect_email, ''))) THEN RETURN 'recipient_mismatch'; END IF;
  ELSE
    v_rcpt := public.sdr_normalize_phone(p_recipient);
    IF v_rcpt IS NULL OR v_rcpt IS DISTINCT FROM public.sdr_normalize_phone(e.prospect_phone) THEN RETURN 'recipient_mismatch'; END IF;
  END IF;
  v_reason := public.sdr_dispatch_ineligibility(a.enrollment_id, a.channel);
  IF v_reason IS NOT NULL THEN RETURN v_reason; END IF;
  INSERT INTO public.sdr_transport_receipts (workspace_id, attempt_id, dispatch_no, stage, recipient)
  VALUES (p_workspace_id, p_attempt_id, p_dispatch_no, p_stage, v_rcpt)
  ON CONFLICT (attempt_id, dispatch_no, stage) DO NOTHING;
  IF NOT FOUND THEN RETURN 'replay'; END IF;
  RETURN 'ok';
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

-- ─── 9b. Exclusão atómica por token (email_unsubscribe_tokens)
-- Esquema real confirmado: email_unsubscribe_tokens(id, token, email, created_at, used_at).
-- NÃO existe workspace_id — o workspace é derivado das inscrições SDR do email.
-- Atomicidade: tudo numa só transação e a supressão é gravada ANTES de marcar o
-- token como usado; uma falha parcial faz rollback e o token continua válido,
-- pelo que nunca se consome o token sem excluir o endereço.
CREATE OR REPLACE FUNCTION public.email_process_unsubscribe(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text; v_used timestamptz; v_ids uuid[]; v_stopped integer := 0;
BEGIN
  IF p_token IS NULL OR length(btrim(p_token)) < 16 THEN
    RETURN jsonb_build_object('found', false, 'reason', 'invalid_token');
  END IF;

  SELECT lower(btrim(email)), used_at INTO v_email, v_used
    FROM public.email_unsubscribe_tokens
   WHERE token = p_token
   ORDER BY created_at DESC
   LIMIT 1
     FOR UPDATE;

  IF v_email IS NULL THEN RETURN jsonb_build_object('found', false, 'reason', 'not_found'); END IF;

  -- 1) Supressão global (idempotente).
  INSERT INTO public.suppressed_emails (email, reason)
  VALUES (v_email, 'unsubscribe')
  ON CONFLICT (email) DO NOTHING;

  -- 2) Paragem das inscrições SDR + supressão por workspace.
  WITH o AS (
    UPDATE public.sdr_enrollments
       SET status = 'opted_out', opted_out_at = now(), next_send_at = NULL, updated_at = now()
     WHERE lower(prospect_email) = v_email
       AND status IN ('enrolled','sequenced','paused')
    RETURNING id, workspace_id
  ), s AS (
    INSERT INTO public.sdr_suppressions (workspace_id, email, reason, source_enrollment_id)
    SELECT DISTINCT ON (workspace_id) workspace_id, v_email, 'unsubscribe_link', id FROM o
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT array_agg(id) INTO v_ids FROM o;

  IF v_ids IS NOT NULL THEN
    UPDATE public.sdr_step_attempts
       SET status = 'cancelled', last_error = 'opted_out', updated_at = now()
     WHERE enrollment_id = ANY (v_ids) AND status IN ('reserved','failed_retryable');
    v_stopped := coalesce(array_length(v_ids, 1), 0);
  END IF;

  -- 3) Só no fim: consumo do token (na mesma transação).
  IF v_used IS NOT NULL THEN
    RETURN jsonb_build_object('found', true, 'already', true, 'email', v_email, 'enrollments_stopped', v_stopped);
  END IF;
  UPDATE public.email_unsubscribe_tokens SET used_at = now() WHERE token = p_token AND used_at IS NULL;
  RETURN jsonb_build_object('found', true, 'already', false, 'email', v_email, 'enrollments_stopped', v_stopped);
END $$;

CREATE INDEX IF NOT EXISTS idx_sdr_enrollments_email_lower
  ON public.sdr_enrollments (lower(prospect_email)) WHERE prospect_email IS NOT NULL;

-- ─── 10. Execução restrita ao service_role
REVOKE ALL ON FUNCTION public.email_process_unsubscribe(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_process_unsubscribe(text) TO service_role;
REVOKE ALL ON FUNCTION public.sdr_claim_step_attempt(uuid,uuid,uuid,uuid,integer,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_begin_dispatch(uuid,text,integer,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_reserve_send_slot(uuid,text,text,uuid,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_finish_attempt(uuid,text[],text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_consume_transport_token(uuid,uuid,integer,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_dispatch_ineligibility(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_stop_enrollments_on_inbound(uuid,uuid,text,text,uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_apply_email_optout(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sdr_on_inbound_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_claim_step_attempt(uuid,uuid,uuid,uuid,integer,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_begin_dispatch(uuid,text,integer,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_reserve_send_slot(uuid,text,text,uuid,integer,integer,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_finish_attempt(uuid,text[],text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_consume_transport_token(uuid,uuid,integer,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_dispatch_ineligibility(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_stop_enrollments_on_inbound(uuid,uuid,text,text,uuid,uuid,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.sdr_apply_email_optout(text) TO service_role;
