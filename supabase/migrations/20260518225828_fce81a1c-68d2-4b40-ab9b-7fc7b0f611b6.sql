
-- =============================================================================
-- Cobranças Premium — Fase 3: motor de dunning + promessas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- evaluate_next_action: calcula próximo next_action_at de um caso
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collections_evaluate_next_action(p_case_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_step RECORD;
  v_next_step integer;
  v_oldest_due date;
  v_next_at timestamptz;
  v_pending_promise_until date;
BEGIN
  SELECT * INTO v_case FROM public.collection_cases WHERE id = p_case_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_case.status IN ('paid','closed') THEN
    UPDATE public.collection_cases SET next_action_at = NULL WHERE id = p_case_id;
    RETURN NULL;
  END IF;

  IF v_case.sequence_id IS NULL THEN
    UPDATE public.collection_cases SET next_action_at = NULL WHERE id = p_case_id;
    RETURN NULL;
  END IF;

  -- Respeitar promessa de pagamento ativa (pending, data futura)
  SELECT MAX(promised_date) INTO v_pending_promise_until
  FROM public.payment_promises
  WHERE case_id = p_case_id AND status = 'pending' AND promised_date >= CURRENT_DATE;

  -- Próximo step = current_step_order + 1, ou 1 se nulo
  v_next_step := COALESCE(v_case.current_step_order, 0) + 1;

  SELECT * INTO v_step
  FROM public.dunning_steps
  WHERE sequence_id = v_case.sequence_id
    AND step_order = v_next_step
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.collection_cases SET next_action_at = NULL WHERE id = p_case_id;
    RETURN NULL;
  END IF;

  v_oldest_due := v_case.oldest_due_date;
  IF v_oldest_due IS NULL THEN
    UPDATE public.collection_cases SET next_action_at = NULL WHERE id = p_case_id;
    RETURN NULL;
  END IF;

  v_next_at := (v_oldest_due + v_step.days_after_due)::timestamptz + interval '9 hours';

  -- Se há promessa ativa, atrasar para o dia seguinte à data prometida
  IF v_pending_promise_until IS NOT NULL AND v_pending_promise_until >= CURRENT_DATE THEN
    v_next_at := GREATEST(v_next_at, (v_pending_promise_until + 1)::timestamptz + interval '9 hours');
  END IF;

  UPDATE public.collection_cases
  SET next_action_at = v_next_at, updated_at = now()
  WHERE id = p_case_id;

  RETURN v_next_at;
END;
$$;

-- ---------------------------------------------------------------------------
-- advance_step: avança step, regista ação automatizada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collections_advance_step(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case RECORD;
  v_step RECORD;
  v_next_order integer;
  v_action_id uuid;
  v_has_promise boolean;
BEGIN
  SELECT * INTO v_case FROM public.collection_cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;

  IF v_case.status IN ('paid','closed') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'case_closed');
  END IF;

  -- Verificar promessa ativa
  SELECT EXISTS (
    SELECT 1 FROM public.payment_promises
    WHERE case_id = p_case_id AND status = 'pending' AND promised_date >= CURRENT_DATE
  ) INTO v_has_promise;

  IF v_has_promise THEN
    -- Reagendar e não executar
    PERFORM public.collections_evaluate_next_action(p_case_id);
    RETURN jsonb_build_object('ok', false, 'reason', 'pending_promise');
  END IF;

  v_next_order := COALESCE(v_case.current_step_order, 0) + 1;

  SELECT * INTO v_step
  FROM public.dunning_steps
  WHERE sequence_id = v_case.sequence_id
    AND step_order = v_next_order
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    -- Sem mais steps → escalar
    UPDATE public.collection_cases
    SET status = 'escalated', next_action_at = NULL, updated_at = now()
    WHERE id = p_case_id;
    RETURN jsonb_build_object('ok', true, 'escalated', true);
  END IF;

  -- Registar ação automatizada
  INSERT INTO public.collection_actions (
    workspace_id, case_id, action_type, channel, subject, body,
    step_id, is_automated, metadata
  ) VALUES (
    v_case.workspace_id, p_case_id, v_step.action_type, v_step.channel,
    v_step.template_subject, v_step.template_body,
    v_step.id, true,
    jsonb_build_object('auto_executor', true, 'step_order', v_step.step_order)
  ) RETURNING id INTO v_action_id;

  -- Atualizar caso
  UPDATE public.collection_cases
  SET current_step_order = v_next_order,
      last_action_at = now(),
      status = CASE WHEN status = 'new' THEN 'in_progress'::collection_case_status ELSE status END,
      updated_at = now()
  WHERE id = p_case_id;

  -- Calcular próximo agendamento
  PERFORM public.collections_evaluate_next_action(p_case_id);

  RETURN jsonb_build_object('ok', true, 'action_id', v_action_id, 'step_order', v_next_order);
END;
$$;

-- ---------------------------------------------------------------------------
-- check_payment_promises: varre promessas vencidas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collections_check_payment_promises()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_promise RECORD;
BEGIN
  FOR v_promise IN
    SELECT id, case_id, workspace_id
    FROM public.payment_promises
    WHERE status = 'pending' AND promised_date < CURRENT_DATE
  LOOP
    UPDATE public.payment_promises
    SET status = 'broken', resolved_at = now(), updated_at = now()
    WHERE id = v_promise.id;

    INSERT INTO public.collection_actions (
      workspace_id, case_id, action_type, channel, subject, is_automated, metadata
    ) VALUES (
      v_promise.workspace_id, v_promise.case_id, 'system', 'system',
      'Promessa de pagamento quebrada', true,
      jsonb_build_object('promise_id', v_promise.id)
    );

    -- Reagendar dunning imediato
    UPDATE public.collection_cases
    SET status = CASE WHEN status = 'promise' THEN 'in_progress'::collection_case_status ELSE status END,
        updated_at = now()
    WHERE id = v_promise.case_id;

    PERFORM public.collections_evaluate_next_action(v_promise.case_id);

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- assign_sequence: atribui sequência ao caso e recalcula agendamento
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collections_assign_sequence(p_case_id uuid, p_sequence_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.collection_cases
  SET sequence_id = p_sequence_id,
      current_step_order = NULL,
      updated_at = now()
  WHERE id = p_case_id;
  RETURN public.collections_evaluate_next_action(p_case_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.collections_evaluate_next_action(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collections_advance_step(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collections_check_payment_promises() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collections_assign_sequence(uuid, uuid) TO authenticated;
