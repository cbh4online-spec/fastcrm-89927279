-- Regressões da revisão independente (begin_dispatch transaccional, quota por
-- despacho em mudança de dia, recibos anti-replay, consentimento WhatsApp).
DO $$
DECLARE r record; v text; a1 uuid; a2 uuid;
  wa uuid := '00000000-0000-0000-0000-00000000000a';
  c9 uuid := '00000000-0000-0000-0000-0000000000c9';
  s9 uuid := '00000000-0000-0000-0000-0000000000d9';
  st uuid := '00000000-0000-0000-0000-0000000000f9';
  e8 uuid := '00000000-0000-0000-0000-0000000000a8';
  e7 uuid := '00000000-0000-0000-0000-0000000000a7';
  e6 uuid := '00000000-0000-0000-0000-0000000000a6';
BEGIN
  INSERT INTO public.multichannel_sequences VALUES (s9, wa, 'active');
  INSERT INTO public.multichannel_sequence_steps VALUES (st, s9, true);
  INSERT INTO public.sdr_campaigns (id, workspace_id, settings, status, sequence_id, autonomous_send_enabled)
    VALUES (c9, wa, '{}', 'active', s9, true);
  INSERT INTO public.sdr_enrollments (id, campaign_id, workspace_id, prospect_email, prospect_phone, status, current_step)
    VALUES (e8, c9, wa, 'rep@x.pt', '912000001', 'sequenced', 0),
           (e7, c9, wa, 'day@x.pt', '912000002', 'sequenced', 0),
           (e6, c9, wa, 'wa@x.pt',  '912000003', 'sequenced', 0);

  -- 1) Campanha pausada DEPOIS da reserva → begin_dispatch recusa, nada consumido.
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e8, c9, st, 1, 'email'); a1 := r.attempt_id;
  ASSERT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'email', 'email:c', a1, 1, 10, 0));
  UPDATE public.sdr_campaigns SET status = 'paused' WHERE id = c9;
  v := public.sdr_begin_dispatch(a1, 'email:c', 0);
  ASSERT v = 'campaign_inactive', 'campanha pausada: ' || v;
  ASSERT (SELECT status = 'reserved' AND attempt_count = 0 FROM public.sdr_step_attempts WHERE id = a1);
  -- 2) Sequência pausada também recusa.
  UPDATE public.sdr_campaigns SET status = 'active' WHERE id = c9;
  UPDATE public.multichannel_sequences SET status = 'paused' WHERE id = s9;
  ASSERT public.sdr_begin_dispatch(a1, 'email:c', 0) = 'sequence_inactive';
  UPDATE public.multichannel_sequences SET status = 'active' WHERE id = s9;
  -- Etapa diferente da esperada recusa.
  ASSERT public.sdr_begin_dispatch(a1, 'email:c', 1) = 'step_changed';
  -- Exclusão posterior recusa.
  INSERT INTO public.suppressed_emails (email, reason) VALUES ('rep@x.pt', 't');
  ASSERT public.sdr_begin_dispatch(a1, 'email:c', 0) = 'suppressed';
  DELETE FROM public.suppressed_emails WHERE email = 'rep@x.pt';
  -- Caminho feliz consome a reserva.
  ASSERT public.sdr_begin_dispatch(a1, 'email:c', 0) = 'ok';
  ASSERT (SELECT consumed_at IS NOT NULL FROM public.sdr_send_reservations WHERE attempt_id = a1 AND dispatch_no = 1);
  -- Despacho consumido nunca é reutilizado.
  ASSERT (SELECT reason FROM public.sdr_reserve_send_slot(wa, 'email', 'email:c', a1, 1, 10, 0)) = 'attempt_not_reservable';

  -- 6) Anti-replay na fronteira: vínculo e recibo único por transporte.
  ASSERT public.sdr_consume_transport_token(wa, a1, 1, 'email-send', 'email', 'outro@x.pt') = 'recipient_mismatch';
  ASSERT public.sdr_consume_transport_token(wa, a1, 2, 'email-send', 'email', 'rep@x.pt') = 'dispatch_mismatch';
  ASSERT public.sdr_consume_transport_token('00000000-0000-0000-0000-00000000000b', a1, 1, 'email-send', 'email', 'rep@x.pt') = 'workspace_mismatch';
  ASSERT public.sdr_consume_transport_token(wa, a1, 1, 'email-send', 'whatsapp', '912000001') = 'channel_mismatch';
  -- (consumo concorrente real feito no script shell sobre este mesmo a1, etapa 900)
  UPDATE public.sdr_step_attempts SET idempotency_key = e8::text || ':900:x' WHERE id = a1;

  -- Aceitação exige estado dispatching; transição inválida devolve false.
  ASSERT NOT public.sdr_finish_attempt(a1, ARRAY['reserved'], 'accepted');

  -- 5) Mudança de dia: reserva de ontem não consumida é revalidada contra a quota de hoje.
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e7, c9, st, 1, 'email'); a2 := r.attempt_id;
  ASSERT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'email', 'email:d', a2, 1, 1, 0));
  UPDATE public.sdr_send_reservations SET local_day = local_day - 1, reserved_at = now() - interval '1 day' WHERE attempt_id = a2;
  -- Outra tentativa ocupa a quota de hoje (1/dia).
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e6, c9, st, 1, 'email');
  ASSERT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'email', 'email:d', r.attempt_id, 1, 1, 0));
  ASSERT (SELECT reason FROM public.sdr_reserve_send_slot(wa, 'email', 'email:d', a2, 1, 1, 0)) = 'daily_limit',
         'reserva de ontem não pode dar already_reserved hoje';
  -- E begin_dispatch recusa por falta de reserva válida hoje.
  ASSERT public.sdr_begin_dispatch(a2, 'email:d', 0) = 'quota_reservation_missing';
  -- Cancelamento liberta reservas não consumidas.
  ASSERT public.sdr_finish_attempt(r.attempt_id, ARRAY['reserved'], 'cancelled');
  ASSERT (SELECT bool_and(released) FROM public.sdr_send_reservations WHERE attempt_id = r.attempt_id);

  -- 7) WhatsApp: sem consentimento não passa; com consentimento revogado também não.
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e6, c9, st, 2, 'whatsapp');
  ASSERT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'whatsapp', 'wa:z', r.attempt_id, 1, 5, 0));
  ASSERT public.sdr_begin_dispatch(r.attempt_id, 'wa:z', 0) = 'whatsapp_consent_missing';
  INSERT INTO public.whatsapp_consents (workspace_id, phone, status, consent_category, revoked_at)
    VALUES (wa, '+351 912 000 003', 'granted', 'marketing', now());
  ASSERT public.sdr_begin_dispatch(r.attempt_id, 'wa:z', 0) = 'whatsapp_consent_missing';
  UPDATE public.whatsapp_consents SET revoked_at = NULL WHERE workspace_id = wa;
  INSERT INTO public.whatsapp_optouts (workspace_id, phone) VALUES (wa, '912000003');
  ASSERT public.sdr_begin_dispatch(r.attempt_id, 'wa:z', 0) = 'suppressed';
  DELETE FROM public.whatsapp_optouts WHERE workspace_id = wa;
  ASSERT public.sdr_begin_dispatch(r.attempt_id, 'wa:z', 0) = 'ok';

  -- Permissões
  ASSERT NOT has_function_privilege('authenticated', 'public.sdr_consume_transport_token(uuid,uuid,integer,text,text,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.sdr_begin_dispatch(uuid,text,integer,integer,text)', 'EXECUTE');
  ASSERT has_function_privilege('service_role', 'public.sdr_finish_attempt(uuid,text[],text,text,text,timestamptz)', 'EXECUTE');
  RAISE NOTICE 'review assertions OK';
END $$;
