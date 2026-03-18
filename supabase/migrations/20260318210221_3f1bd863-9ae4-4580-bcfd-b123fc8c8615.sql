
-- Function for super admins to manually assign credits to a workspace
-- Creates wallet if it doesn't exist, adds credits, and logs in ledger
CREATE OR REPLACE FUNCTION public.admin_assign_credits(
  p_workspace_id UUID,
  p_admin_user_id UUID,
  p_credits_amount INTEGER,
  p_description TEXT DEFAULT 'Créditos atribuídos manualmente pelo admin',
  p_module TEXT DEFAULT 'admin'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
  v_direction TEXT;
BEGIN
  -- Verify the caller is a super admin
  IF NOT public.is_super_admin(p_admin_user_id) THEN
    RETURN QUERY SELECT false, 0, 'Permissão negada: apenas super admins podem atribuir créditos'::TEXT;
    RETURN;
  END IF;

  -- Validate amount (can be negative for deductions)
  IF p_credits_amount = 0 THEN
    RETURN QUERY SELECT false, 0, 'A quantidade de créditos não pode ser zero'::TEXT;
    RETURN;
  END IF;

  -- Determine direction
  v_direction := CASE WHEN p_credits_amount > 0 THEN 'credit' ELSE 'debit' END;

  -- Upsert wallet
  INSERT INTO credit_wallets (workspace_id, balance)
  VALUES (p_workspace_id, GREATEST(p_credits_amount, 0))
  ON CONFLICT (workspace_id)
  DO UPDATE SET 
    balance = credit_wallets.balance + p_credits_amount,
    updated_at = now()
  RETURNING id, balance INTO v_wallet_id, v_new_balance;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'O saldo não pode ficar negativo. Saldo atual insuficiente.';
  END IF;

  -- Log in ledger
  INSERT INTO credit_ledger (
    workspace_id, user_id, action_key, module, credits_amount,
    direction, status, description, metadata
  ) VALUES (
    p_workspace_id, p_admin_user_id, 'admin_manual_assign', p_module,
    ABS(p_credits_amount), v_direction, 'completed', p_description,
    jsonb_build_object('admin_user_id', p_admin_user_id, 'manual', true)
  );

  RETURN QUERY SELECT true, v_new_balance, ('Créditos atribuídos com sucesso. Novo saldo: ' || v_new_balance)::TEXT;
END;
$$;
