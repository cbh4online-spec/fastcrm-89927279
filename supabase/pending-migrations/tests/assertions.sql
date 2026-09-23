DO $$
DECLARE r record; n int;
  wa uuid := '00000000-0000-0000-0000-00000000000a';
  wb uuid := '00000000-0000-0000-0000-00000000000b';
  c1 uuid := '00000000-0000-0000-0000-0000000000c1';
  e1 uuid := '00000000-0000-0000-0000-0000000000e1';
  e3 uuid := '00000000-0000-0000-0000-0000000000e3';
BEGIN
  -- Identidade igual à implementação TS
  ASSERT public.sdr_identity_key(' A@B.PT ', NULL, NULL, NULL, NULL) = 'email:a@b.pt';
  ASSERT public.sdr_identity_key(NULL, '+351 912 345 678', NULL, NULL, NULL) = 'phone:351912345678';
  ASSERT public.sdr_identity_key(NULL, '912345678', NULL, NULL, NULL) = 'phone:351912345678';
  ASSERT public.sdr_identity_key(NULL, '00351912345678', NULL, NULL, NULL) = 'phone:351912345678';
  ASSERT public.sdr_identity_key(NULL, NULL, NULL, 'aaaaaaaa-0000-0000-0000-000000000000', NULL) = 'lead:aaaaaaaa-0000-0000-0000-000000000000';

  -- Backfill de duplicados: só o mais antigo fica com a chave; o outro marcado, nada apagado.
  SELECT count(*) INTO n FROM public.sdr_enrollments; ASSERT n = 3, 'nenhuma linha apagada';
  ASSERT (SELECT identity_key FROM public.sdr_enrollments WHERE id = e1) = 'email:ana@x.pt';
  ASSERT (SELECT identity_key IS NULL AND metadata ? 'sdr_duplicate_of' FROM public.sdr_enrollments WHERE id = '00000000-0000-0000-0000-0000000000e2');
  ASSERT (SELECT identity_key FROM public.sdr_enrollments WHERE id = e3) = 'email:ana@x.pt', 'outro workspace/campanha mantém chave própria';

  -- Unicidade por campanha+identidade
  BEGIN
    INSERT INTO public.sdr_enrollments (campaign_id, workspace_id, identity_key) VALUES (c1, wa, 'email:ana@x.pt');
    RAISE EXCEPTION 'devia falhar';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Novo estado 'paused' agora aceite
  UPDATE public.sdr_enrollments SET status = 'paused' WHERE id = '00000000-0000-0000-0000-0000000000e2';

  -- Claim idempotente
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e1, c1, NULL, 1, 'email');
  ASSERT r.claimed;
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e1, c1, NULL, 1, 'email');
  ASSERT NOT r.claimed, 'segundo claim com lease activo recusado';
  ASSERT public.sdr_begin_dispatch(r.attempt_id, 'email:x');
  -- lease expira durante dispatch → ambíguo, nunca novo claim
  UPDATE public.sdr_step_attempts SET lease_expires_at = now() - interval '1 second' WHERE id = r.attempt_id;
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e1, c1, NULL, 1, 'email');
  ASSERT NOT r.claimed AND r.attempt_status = 'ambiguous';

  -- Isolamento: inscrição de A com workspace B → erro
  BEGIN
    PERFORM public.sdr_claim_step_attempt(wb, e1, c1, NULL, 2, 'email');
    RAISE EXCEPTION 'devia falhar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'sdr_enrollment_workspace_mismatch' THEN RAISE; END IF;
  END;

  -- Quota: sem configuração → recusado
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e1, c1, NULL, 3, 'whatsapp');
  ASSERT NOT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'whatsapp', 'wa:y', r.attempt_id, NULL, 45));
  -- Intervalo mínimo
  ASSERT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'whatsapp', 'wa:y', r.attempt_id, 20, 45));
  ASSERT (SELECT allowed FROM public.sdr_reserve_send_slot(wa, 'whatsapp', 'wa:y', r.attempt_id, 20, 45)), 'mesma tentativa é idempotente';
  SELECT * INTO r FROM public.sdr_claim_step_attempt(wa, e1, c1, NULL, 4, 'whatsapp');
  ASSERT (SELECT reason FROM public.sdr_reserve_send_slot(wa, 'whatsapp', 'wa:y', r.attempt_id, 20, 45)) = 'min_interval';

  -- Tentativas para o teste de concorrência (steps 101..110)
  FOR n IN 101..110 LOOP PERFORM public.sdr_claim_step_attempt(wa, e1, c1, NULL, n, 'whatsapp'); END LOOP;

  -- Resposta de entrada: trigger pára só o workspace A
  INSERT INTO public.conversations VALUES ('00000000-0000-0000-0000-0000000000f1', wa, 'email', 'ana@x.pt', NULL, NULL);
  UPDATE public.sdr_enrollments SET conversation_id = '00000000-0000-0000-0000-0000000000f1' WHERE id = e1;
  INSERT INTO public.messages (conversation_id, workspace_id, direction) VALUES ('00000000-0000-0000-0000-0000000000f1', wa, 'inbound');
  ASSERT (SELECT status = 'replied' AND reply_detected_at IS NOT NULL AND next_send_at IS NULL FROM public.sdr_enrollments WHERE id = e1);
  ASSERT (SELECT status FROM public.sdr_enrollments WHERE id = e3) = 'sequenced', 'outro workspace não é afectado';
  -- Mensagem outbound não pára nada
  UPDATE public.sdr_enrollments SET status = 'sequenced' WHERE id = e3;
  INSERT INTO public.messages (conversation_id, workspace_id, direction) VALUES ('00000000-0000-0000-0000-0000000000f1', wb, 'outbound');
  ASSERT (SELECT status FROM public.sdr_enrollments WHERE id = e3) = 'sequenced';
  -- Mensagem de entrada com conversa de outro workspace é ignorada (conversa não pertence a B)
  INSERT INTO public.messages (conversation_id, workspace_id, direction) VALUES ('00000000-0000-0000-0000-0000000000f1', wb, 'inbound');
  ASSERT (SELECT status FROM public.sdr_enrollments WHERE id = e3) = 'sequenced';

  -- Exclusão por email propaga e cria supressão por workspace
  ASSERT public.sdr_apply_email_optout('ANA@x.pt') >= 1;
  ASSERT (SELECT status FROM public.sdr_enrollments WHERE id = e3) = 'opted_out';
  ASSERT EXISTS (SELECT 1 FROM public.sdr_suppressions WHERE workspace_id = wb AND email = 'ana@x.pt');

  -- Permissões: authenticated não executa RPCs internas
  ASSERT NOT has_function_privilege('authenticated', 'public.sdr_claim_step_attempt(uuid,uuid,uuid,uuid,integer,text,integer)', 'EXECUTE');
  ASSERT has_function_privilege('service_role', 'public.sdr_reserve_send_slot(uuid,text,text,uuid,integer,integer,text)', 'EXECUTE');
  RAISE NOTICE 'assertions OK';
END $$;
