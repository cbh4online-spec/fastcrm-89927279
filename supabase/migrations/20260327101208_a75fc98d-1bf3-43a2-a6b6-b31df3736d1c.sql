
CREATE OR REPLACE FUNCTION public.consume_funnel_credits(
  p_workspace_id UUID,
  p_user_id UUID,
  p_action_key TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(success BOOLEAN, credits_consumed INTEGER, balance_remaining INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance INTEGER;
  v_cost INTEGER;
  v_rule_module TEXT;
  v_rule_label TEXT;
  v_new_balance INTEGER;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM credit_ledger
      WHERE workspace_id = p_workspace_id
        AND metadata->>'idempotency_key' = p_idempotency_key
        AND status = 'completed'
    ) THEN
      -- Already processed
      SELECT cw.balance INTO v_balance FROM credit_wallets cw WHERE cw.workspace_id = p_workspace_id;
      RETURN QUERY SELECT true, 0, COALESCE(v_balance, 0)::INTEGER, 'Já processado (idempotência)'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Get pricing rule
  SELECT credits_cost, module, label INTO v_cost, v_rule_module, v_rule_label
  FROM credit_pricing_rules
  WHERE action_key = p_action_key AND is_active = true
  LIMIT 1;

  IF v_cost IS NULL THEN
    -- No pricing rule found, allow for free
    RETURN QUERY SELECT true, 0, 0, 'Sem regra de preço definida'::TEXT;
    RETURN;
  END IF;

  IF v_cost = 0 THEN
    RETURN QUERY SELECT true, 0, 0, 'Ação gratuita'::TEXT;
    RETURN;
  END IF;

  -- Get wallet and lock row
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM credit_wallets
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Carteira de créditos não encontrada'::TEXT;
    RETURN;
  END IF;

  IF v_balance < v_cost THEN
    RETURN QUERY SELECT false, 0, v_balance::INTEGER, ('Créditos insuficientes. Necessário: ' || v_cost || ', disponível: ' || v_balance)::TEXT;
    RETURN;
  END IF;

  -- Deduct
  v_new_balance := v_balance - v_cost;

  UPDATE credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet_id;

  -- Record in ledger
  INSERT INTO credit_ledger (
    workspace_id, user_id, action_key, module,
    reference_type, reference_id,
    credits_amount, direction, status, description, metadata
  ) VALUES (
    p_workspace_id, p_user_id, p_action_key, v_rule_module,
    p_reference_type, p_reference_id,
    v_cost, 'debit', 'completed',
    v_rule_label,
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'cost', v_cost,
      'balance_before', v_balance,
      'balance_after', v_new_balance
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY SELECT true, v_cost::INTEGER, v_new_balance::INTEGER, 'Créditos consumidos com sucesso'::TEXT;
END;
$$;
