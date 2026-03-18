-- Create missing credit wallet table used by admin_assign_credits and super-admin UI
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  reserved_balance INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER,
  daily_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_wallets_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT credit_wallets_reserved_non_negative CHECK (reserved_balance >= 0)
);

-- Create missing credit ledger table used by wallet history
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  action_key TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'crm',
  reference_type TEXT,
  reference_id TEXT,
  credits_amount INTEGER NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_ledger_amount_positive CHECK (credits_amount > 0),
  CONSTRAINT credit_ledger_direction_valid CHECK (direction IN ('credit','debit'))
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_workspace_created_at
  ON public.credit_ledger (workspace_id, created_at DESC);

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Wallet read access for workspace members and super admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_wallets'
      AND policyname = 'Members and super admins can view credit wallets'
  ) THEN
    CREATE POLICY "Members and super admins can view credit wallets"
      ON public.credit_wallets
      FOR SELECT
      USING (
        public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = credit_wallets.workspace_id
            AND wm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Wallet write access only for super admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_wallets'
      AND policyname = 'Super admins can manage credit wallets'
  ) THEN
    CREATE POLICY "Super admins can manage credit wallets"
      ON public.credit_wallets
      FOR ALL
      USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- Ledger read access for workspace members and super admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_ledger'
      AND policyname = 'Members and super admins can view credit ledger'
  ) THEN
    CREATE POLICY "Members and super admins can view credit ledger"
      ON public.credit_ledger
      FOR SELECT
      USING (
        public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workspace_members wm
          WHERE wm.workspace_id = credit_ledger.workspace_id
            AND wm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Ledger insert only for super admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'credit_ledger'
      AND policyname = 'Super admins can insert credit ledger'
  ) THEN
    CREATE POLICY "Super admins can insert credit ledger"
      ON public.credit_ledger
      FOR INSERT
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- Ensure the function exists with explicit public schema references
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
  v_new_balance INTEGER;
  v_direction TEXT;
BEGIN
  IF NOT public.is_super_admin(p_admin_user_id) THEN
    RETURN QUERY SELECT false, 0, 'Permissão negada: apenas super admins podem atribuir créditos'::TEXT;
    RETURN;
  END IF;

  IF p_credits_amount = 0 THEN
    RETURN QUERY SELECT false, 0, 'A quantidade de créditos não pode ser zero'::TEXT;
    RETURN;
  END IF;

  v_direction := CASE WHEN p_credits_amount > 0 THEN 'credit' ELSE 'debit' END;

  INSERT INTO public.credit_wallets (workspace_id, balance)
  VALUES (p_workspace_id, GREATEST(p_credits_amount, 0))
  ON CONFLICT (workspace_id)
  DO UPDATE SET
    balance = public.credit_wallets.balance + p_credits_amount,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'O saldo não pode ficar negativo. Saldo atual insuficiente.';
  END IF;

  INSERT INTO public.credit_ledger (
    workspace_id,
    user_id,
    action_key,
    module,
    credits_amount,
    direction,
    status,
    description,
    metadata
  ) VALUES (
    p_workspace_id,
    p_admin_user_id,
    'admin_manual_assign',
    p_module,
    ABS(p_credits_amount),
    v_direction,
    'completed',
    p_description,
    jsonb_build_object('admin_user_id', p_admin_user_id, 'manual', true)
  );

  RETURN QUERY SELECT true, v_new_balance, ('Créditos atribuídos com sucesso. Novo saldo: ' || v_new_balance)::TEXT;
END;
$$;