-- Search access and charging are enforced in the database, not by the browser.
-- The existing credit_wallets / credit_ledger remain the source of truth.
CREATE TABLE public.prospecting_search_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  request_id uuid NOT NULL,
  action_key text NOT NULL CHECK (action_key IN (
    'prospecting_google_local_search',
    'prospecting_web_search',
    'prospecting_professional_search'
  )),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'failed', 'expired')),
  credits_cost integer NOT NULL CHECK (credits_cost > 0),
  quota_limit integer NOT NULL CHECK (quota_limit > 0),
  response_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE (workspace_id, request_id)
);

CREATE INDEX prospecting_search_operations_quota_idx
  ON public.prospecting_search_operations (workspace_id, created_at, status);

ALTER TABLE public.prospecting_search_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read prospecting search operations"
  ON public.prospecting_search_operations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = prospecting_search_operations.workspace_id
      AND wm.user_id = auth.uid()
  ));

-- The existing UI expects these action keys. A missing/inactive rule now fails
-- closed; administrators may change the cost without redeploying functions.
INSERT INTO public.credit_pricing_rules
  (action_key, label, description, credits_cost, module, category, is_active)
VALUES
  ('prospecting_google_local_search', 'Pesquisa Google Local', 'Pesquisa de negócios locais', 1, 'prospecting', 'search', true),
  ('prospecting_web_search', 'Pesquisa Web', 'Pesquisa de empresas e profissionais na Web', 1, 'prospecting', 'search', true),
  ('prospecting_professional_search', 'Pesquisa de Profissionais', 'Pesquisa de perfis profissionais em várias fontes', 5, 'prospecting', 'search', true)
ON CONFLICT (action_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.begin_prospecting_search(
  p_workspace_id uuid,
  p_action_key text,
  p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text;
  v_quota integer;
  v_cost integer;
  v_balance integer;
  v_reserved integer;
  v_existing public.prospecting_search_operations%ROWTYPE;
  v_operation_id uuid;
  v_used integer;
  v_expired_id uuid;
  v_expired_cost integer;
  v_module_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'unauthorized', 'error', 'Autenticação necessária');
  END IF;
  IF p_workspace_id IS NULL OR p_request_id IS NULL OR p_action_key NOT IN (
    'prospecting_google_local_search', 'prospecting_web_search', 'prospecting_professional_search'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_request', 'error', 'Pedido inválido');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members wm
                 WHERE wm.workspace_id = p_workspace_id AND wm.user_id = v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden', 'error', 'Sem acesso ao espaço de trabalho');
  END IF;

  -- Serialize this workspace's quota, wallet and idempotency checks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 9917));
  SELECT balance, reserved_balance INTO v_balance, v_reserved
  FROM public.credit_wallets
  WHERE workspace_id = p_workspace_id FOR UPDATE;

  -- A process may die after reserving. Release old reservations on the next
  -- request, before checking the wallet or monthly usage.
  FOR v_expired_id, v_expired_cost IN
    SELECT id, credits_cost FROM public.prospecting_search_operations
    WHERE workspace_id = p_workspace_id AND status = 'reserved'
      AND created_at < now() - interval '15 minutes'
    FOR UPDATE
  LOOP
    UPDATE public.prospecting_search_operations
      SET status = 'expired', settled_at = now()
      WHERE id = v_expired_id;
    IF v_balance IS NOT NULL THEN
      v_balance := v_balance + v_expired_cost;
      v_reserved := greatest(0, v_reserved - v_expired_cost);
      UPDATE public.credit_wallets
        SET balance = v_balance, reserved_balance = v_reserved, updated_at = now()
        WHERE workspace_id = p_workspace_id;
    END IF;
    UPDATE public.credit_ledger
      SET status = 'refunded'
      WHERE workspace_id = p_workspace_id
        AND metadata->>'prospecting_operation_id' = v_expired_id::text
        AND status = 'pending';
  END LOOP;

  SELECT * INTO v_existing FROM public.prospecting_search_operations
    WHERE workspace_id = p_workspace_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.user_id <> v_user_id OR v_existing.action_key <> p_action_key THEN
      RETURN jsonb_build_object('success', false, 'code', 'idempotency_conflict', 'error', 'Identificador já utilizado');
    END IF;
    IF v_existing.status = 'completed' THEN
      RETURN jsonb_build_object('success', true, 'status', 'completed',
        'operation_id', v_existing.id, 'credits_reserved', 0,
        'response', v_existing.response_data);
    END IF;
    RETURN jsonb_build_object('success', false, 'code', v_existing.status,
      'error', CASE WHEN v_existing.status = 'reserved' THEN 'Pesquisa em curso' ELSE 'Pesquisa anterior não concluída' END);
  END IF;

  SELECT ws.plan::text INTO v_plan
  FROM public.workspace_subscriptions ws
  WHERE ws.workspace_id = p_workspace_id
    AND ws.status IN ('active', 'trialing')
    AND (ws.current_period_end IS NULL OR ws.current_period_end > now());
  v_quota := CASE v_plan
    WHEN 'basic' THEN 100 WHEN 'growth' THEN 100
    WHEN 'pro' THEN 500 WHEN 'agency' THEN 500 WHEN 'scale' THEN 500
    ELSE 0 END;
  IF v_quota = 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'subscription_required',
      'error', 'A prospeção requer um plano Growth ou Scale ativo');
  END IF;

  v_module_slug := CASE p_action_key
    WHEN 'prospecting_google_local_search' THEN 'google-local-services'
    WHEN 'prospecting_professional_search' THEN 'prospecting-pro'
    ELSE NULL END;
  IF v_module_slug IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspace_modules wm
    JOIN public.marketplace_modules mm ON mm.id = wm.module_id
    WHERE wm.workspace_id = p_workspace_id AND mm.slug = v_module_slug
      AND wm.status IN ('active', 'trial')
      AND (wm.trial_ends_at IS NULL OR wm.status <> 'trial' OR wm.trial_ends_at > now())
      AND (wm.current_period_end IS NULL OR wm.current_period_end > now())
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'module_required',
      'error', 'Módulo de prospeção não ativo');
  END IF;

  SELECT credits_cost INTO v_cost FROM public.credit_pricing_rules
    WHERE action_key = p_action_key AND module = 'prospecting'
      AND is_active = true AND credits_cost > 0;
  IF v_cost IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'pricing_unavailable',
      'error', 'Preço da pesquisa não configurado');
  END IF;

  SELECT count(*)::integer INTO v_used
  FROM public.prospecting_search_operations
  WHERE workspace_id = p_workspace_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month'
    AND status IN ('reserved', 'completed');
  IF v_used >= v_quota THEN
    RETURN jsonb_build_object('success', false, 'code', 'quota_exceeded',
      'error', 'Limite mensal de pesquisas atingido', 'usage', v_used, 'limit', v_quota);
  END IF;
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'code', 'insufficient_credits',
      'error', 'Créditos insuficientes', 'credits_required', v_cost,
      'balance_remaining', coalesce(v_balance, 0));
  END IF;

  INSERT INTO public.prospecting_search_operations
    (workspace_id, user_id, request_id, action_key, credits_cost, quota_limit)
  VALUES (p_workspace_id, v_user_id, p_request_id, p_action_key, v_cost, v_quota)
  RETURNING id INTO v_operation_id;

  UPDATE public.credit_wallets
    SET balance = balance - v_cost, reserved_balance = reserved_balance + v_cost,
        updated_at = now()
    WHERE workspace_id = p_workspace_id;
  INSERT INTO public.credit_ledger
    (workspace_id, user_id, action_key, module, credits_amount,
     direction, status, description, metadata)
  VALUES (p_workspace_id, v_user_id, p_action_key, 'prospecting', v_cost,
          'debit', 'pending', 'Pesquisa de prospeção em curso',
          jsonb_build_object('prospecting_operation_id', v_operation_id::text,
                             'request_id', p_request_id::text));

  RETURN jsonb_build_object('success', true, 'status', 'reserved',
    'operation_id', v_operation_id, 'credits_reserved', v_cost,
    'balance_remaining', v_balance - v_cost, 'usage', v_used + 1, 'limit', v_quota);
END;
$$;

-- Service role only. Clients cannot mark a provider request successful or
-- release a reservation themselves.
CREATE OR REPLACE FUNCTION public.settle_prospecting_search(
  p_operation_id uuid,
  p_success boolean,
  p_response jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_op public.prospecting_search_operations%ROWTYPE;
  v_workspace_id uuid;
  v_balance integer;
  v_period_start date;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  SELECT workspace_id INTO v_workspace_id
  FROM public.prospecting_search_operations WHERE id = p_operation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Search operation not found';
  END IF;
  -- Keep lock order identical to begin_prospecting_search.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_workspace_id::text, 9917));
  SELECT balance INTO v_balance FROM public.credit_wallets
    WHERE workspace_id = v_workspace_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Credit wallet not found';
  END IF;
  SELECT * INTO v_op FROM public.prospecting_search_operations
    WHERE id = p_operation_id FOR UPDATE;
  IF v_op.status <> 'reserved' THEN
    RETURN jsonb_build_object('success', v_op.status = 'completed',
      'status', v_op.status, 'response', v_op.response_data);
  END IF;

  IF p_success THEN
    UPDATE public.credit_wallets
      SET reserved_balance = reserved_balance - v_op.credits_cost, updated_at = now()
      WHERE workspace_id = v_op.workspace_id;
    UPDATE public.credit_ledger SET status = 'completed',
      description = 'Pesquisa de prospeção concluída'
      WHERE workspace_id = v_op.workspace_id
        AND metadata->>'prospecting_operation_id' = v_op.id::text
        AND status = 'pending';
    UPDATE public.prospecting_search_operations
      SET status = 'completed', response_data = p_response, settled_at = now()
      WHERE id = v_op.id;

    IF v_op.action_key = 'prospecting_professional_search' THEN
      v_period_start := date_trunc('month', v_op.created_at)::date;
      INSERT INTO public.professional_prospecting_usage
        (workspace_id, period_start, period_end, searches_count, searches_limit)
      VALUES (v_op.workspace_id, v_period_start,
              (v_period_start + interval '1 month - 1 day')::date, 1, v_op.quota_limit)
      ON CONFLICT (workspace_id, period_start) DO UPDATE
        SET searches_count = public.professional_prospecting_usage.searches_count + 1,
            searches_limit = EXCLUDED.searches_limit,
            updated_at = now();
    END IF;
  ELSE
    UPDATE public.credit_wallets
      SET balance = balance + v_op.credits_cost,
          reserved_balance = reserved_balance - v_op.credits_cost,
          updated_at = now()
      WHERE workspace_id = v_op.workspace_id;
    UPDATE public.credit_ledger SET status = 'refunded',
      description = 'Pesquisa de prospeção não concluída; créditos devolvidos'
      WHERE workspace_id = v_op.workspace_id
        AND metadata->>'prospecting_operation_id' = v_op.id::text
        AND status = 'pending';
    UPDATE public.prospecting_search_operations
      SET status = 'failed', settled_at = now() WHERE id = v_op.id;
  END IF;
  RETURN jsonb_build_object('success', p_success,
    'status', CASE WHEN p_success THEN 'completed' ELSE 'failed' END);
END;
$$;

REVOKE ALL ON FUNCTION public.begin_prospecting_search(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.begin_prospecting_search(uuid, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.settle_prospecting_search(uuid, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_prospecting_search(uuid, boolean, jsonb) TO service_role;

-- Shared Firecrawl endpoint also serves C2C and store product research. Keep
-- those calls on a separate small quota; they never consume prospecting credit.
CREATE TABLE public.firecrawl_general_usage (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  usage_day date NOT NULL,
  searches_count integer NOT NULL DEFAULT 0 CHECK (searches_count >= 0),
  PRIMARY KEY (workspace_id, usage_day)
);
ALTER TABLE public.firecrawl_general_usage ENABLE ROW LEVEL SECURITY;

-- Remove the old one-argument entry point: otherwise callers could continue
-- consuming the general quota without proving access to the relevant module.
DROP FUNCTION IF EXISTS public.claim_firecrawl_general_search(uuid);
CREATE FUNCTION public.claim_firecrawl_general_search(p_workspace_id uuid, p_module_slug text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'forbidden',
      'error', 'Sem acesso ao espaço de trabalho');
  END IF;
  IF p_module_slug NOT IN ('online-store', 'marketplace-c2c') OR NOT EXISTS (
    SELECT 1 FROM public.workspace_modules wm
    JOIN public.marketplace_modules mm ON mm.id = wm.module_id
    WHERE wm.workspace_id = p_workspace_id
      AND ((p_module_slug = 'online-store' AND mm.slug IN ('online-store', 'loja-online'))
        OR (p_module_slug = 'marketplace-c2c' AND mm.slug = 'marketplace-c2c'))
      AND wm.status IN ('active', 'trial')
      AND (wm.trial_ends_at IS NULL OR wm.status <> 'trial' OR wm.trial_ends_at > now())
      AND (wm.current_period_end IS NULL OR wm.current_period_end > now())
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'module_required',
      'error', 'Módulo de pesquisa de produtos não ativo');
  END IF;
  INSERT INTO public.firecrawl_general_usage (workspace_id, usage_day, searches_count)
  VALUES (p_workspace_id, (now() AT TIME ZONE 'Europe/Lisbon')::date, 1)
  ON CONFLICT (workspace_id, usage_day) DO UPDATE
    SET searches_count = public.firecrawl_general_usage.searches_count + 1
    WHERE public.firecrawl_general_usage.searches_count < 20
  RETURNING searches_count INTO v_count;
  IF v_count IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'quota_exceeded',
      'error', 'Limite diário de pesquisas gerais atingido', 'limit', 20);
  END IF;
  RETURN jsonb_build_object('success', true, 'usage', v_count, 'limit', 20);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_firecrawl_general_search(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_firecrawl_general_search(uuid, text) TO authenticated;

-- Keep the existing Professionals usage widget in step with the shared quota.
-- Its old SECURITY DEFINER implementation also allowed callers to name an
-- arbitrary workspace; the replacement requires membership.
CREATE OR REPLACE FUNCTION public.get_or_create_prospecting_usage(p_workspace_id uuid)
RETURNS public.professional_prospecting_usage
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_usage public.professional_prospecting_usage;
  v_period_start date := date_trunc('month', now())::date;
  v_plan text;
  v_limit integer;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Workspace access denied' USING ERRCODE = '42501';
  END IF;
  SELECT ws.plan::text INTO v_plan FROM public.workspace_subscriptions ws
    WHERE ws.workspace_id = p_workspace_id AND ws.status IN ('active', 'trialing')
      AND (ws.current_period_end IS NULL OR ws.current_period_end > now());
  v_limit := CASE v_plan
    WHEN 'basic' THEN 100 WHEN 'growth' THEN 100
    WHEN 'pro' THEN 500 WHEN 'agency' THEN 500 WHEN 'scale' THEN 500
    ELSE 0 END;
  INSERT INTO public.professional_prospecting_usage
    (workspace_id, period_start, period_end, searches_limit)
  VALUES (p_workspace_id, v_period_start,
          (v_period_start + interval '1 month - 1 day')::date, v_limit)
  ON CONFLICT (workspace_id, period_start) DO UPDATE
    SET searches_limit = EXCLUDED.searches_limit
  RETURNING * INTO v_usage;
  SELECT count(*)::integer INTO v_count
    FROM public.prospecting_search_operations
    WHERE workspace_id = p_workspace_id
      AND created_at >= date_trunc('month', now())
      AND created_at < date_trunc('month', now()) + interval '1 month'
      AND status = 'completed';
  v_usage.searches_count := v_count;
  RETURN v_usage;
END;
$$;
REVOKE ALL ON FUNCTION public.get_or_create_prospecting_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_prospecting_usage(uuid) TO authenticated;
