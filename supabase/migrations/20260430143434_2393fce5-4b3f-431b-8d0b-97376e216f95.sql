CREATE OR REPLACE FUNCTION public.refund_funnel_credits(
  p_workspace_id UUID,
  p_user_id UUID,
  p_action_key TEXT,
  p_idempotency_key TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'edge_function_failure',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(success BOOLEAN, credits_refunded INTEGER, balance_remaining INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance INTEGER;
  v_consumed INTEGER;
  v_ledger_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Localizar a entrada original de débito (idempotência)
  SELECT id, credits_amount INTO v_ledger_id, v_consumed
  FROM credit_ledger
  WHERE workspace_id = p_workspace_id
    AND metadata->>'idempotency_key' = p_idempotency_key
    AND direction = 'debit'
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_ledger_id IS NULL THEN
    SELECT cw.balance INTO v_balance FROM credit_wallets cw WHERE cw.workspace_id = p_workspace_id;
    RETURN QUERY SELECT true, 0, COALESCE(v_balance, 0)::INTEGER, 'Sem débito para estornar'::TEXT;
    RETURN;
  END IF;

  -- Verificar se já foi estornado
  IF EXISTS (
    SELECT 1 FROM credit_ledger
    WHERE workspace_id = p_workspace_id
      AND metadata->>'refund_of' = v_ledger_id::TEXT
      AND direction = 'credit'
  ) THEN
    SELECT cw.balance INTO v_balance FROM credit_wallets cw WHERE cw.workspace_id = p_workspace_id;
    RETURN QUERY SELECT true, 0, COALESCE(v_balance, 0)::INTEGER, 'Já estornado'::TEXT;
    RETURN;
  END IF;

  -- Lock da wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM credit_wallets
  WHERE workspace_id = p_workspace_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Carteira não encontrada'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_balance + v_consumed;

  UPDATE credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO credit_ledger (
    workspace_id, user_id, action_key, module, reference_type, reference_id,
    credits_amount, direction, status, description, metadata
  ) VALUES (
    p_workspace_id, p_user_id, p_action_key,
    COALESCE((SELECT module FROM credit_pricing_rules WHERE action_key = p_action_key LIMIT 1), 'unknown'),
    p_reference_type, p_reference_id,
    v_consumed, 'credit', 'completed',
    'Estorno: ' || p_reason,
    jsonb_build_object(
      'refund_of', v_ledger_id::TEXT,
      'reason', p_reason,
      'idempotency_key', p_idempotency_key || ':refund'
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN QUERY SELECT true, v_consumed, v_new_balance, 'Créditos estornados'::TEXT;
END;
$$;