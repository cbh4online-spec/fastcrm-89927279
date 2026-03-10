
-- Credit Wallets (one per workspace)
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  reserved_balance INTEGER NOT NULL DEFAULT 0,
  monthly_limit INTEGER DEFAULT NULL,
  daily_limit INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Credit Ledger (all movements)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'funnels',
  reference_type TEXT,
  reference_id UUID,
  credits_amount INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit', 'reserve', 'release')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key)
);

-- Credit Pricing Rules
CREATE TABLE IF NOT EXISTS public.credit_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  credits_cost INTEGER NOT NULL DEFAULT 1,
  module TEXT NOT NULL DEFAULT 'funnels',
  category TEXT NOT NULL DEFAULT 'ai',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit Usage Limits
CREATE TABLE IF NOT EXISTS public.credit_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'monthly')),
  max_credits INTEGER NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (use IF NOT EXISTS pattern via DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their workspace wallet') THEN
    CREATE POLICY "Users can view their workspace wallet" ON public.credit_wallets
      FOR SELECT TO authenticated
      USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their workspace ledger') THEN
    CREATE POLICY "Users can view their workspace ledger" ON public.credit_ledger
      FOR SELECT TO authenticated
      USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert ledger entries') THEN
    CREATE POLICY "Users can insert ledger entries" ON public.credit_ledger
      FOR INSERT TO authenticated
      WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active pricing rules') THEN
    CREATE POLICY "Anyone can view active pricing rules" ON public.credit_pricing_rules
      FOR SELECT TO authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their workspace limits') THEN
    CREATE POLICY "Users can view their workspace limits" ON public.credit_usage_limits
      FOR SELECT TO authenticated
      USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Seed default pricing rules
INSERT INTO public.credit_pricing_rules (action_key, label, description, credits_cost, module, category) VALUES
  ('ai_funnel_builder', 'Criar Funil com IA', 'Gerar funil completo com IA', 10, 'funnels', 'ai'),
  ('ai_generate_copy', 'Gerar Copy', 'Gerar copy de página com IA', 3, 'funnels', 'ai'),
  ('ai_rewrite_section', 'Reescrever Secção', 'Reescrever uma secção com IA', 2, 'funnels', 'ai'),
  ('ai_generate_quiz', 'Gerar Quiz', 'Gerar quiz interactivo com IA', 5, 'funnels', 'ai'),
  ('ai_generate_automations', 'Gerar Automações', 'Gerar automações com IA', 4, 'funnels', 'ai'),
  ('ai_generate_routing', 'Gerar Routing', 'Gerar regras de routing com IA', 3, 'funnels', 'ai'),
  ('ai_generate_emails', 'Gerar Emails', 'Gerar sequência de emails com IA', 5, 'funnels', 'ai'),
  ('ai_audit_performance', 'Auditar Performance', 'Análise IA de performance do funil', 4, 'funnels', 'ai'),
  ('ai_ab_variations', 'Criar Variações A/B', 'Gerar variações A/B com IA', 6, 'funnels', 'ai'),
  ('ai_optimize_funnel', 'Optimizar Funil', 'Sugestões de optimização com IA', 4, 'funnels', 'ai'),
  ('ai_funnel_essential', 'Funil Essential', 'Gerar funil simplificado com IA', 5, 'funnels', 'ai'),
  ('ai_funnel_advanced', 'Funil Advanced', 'Gerar funil avançado com IA', 15, 'funnels', 'ai')
ON CONFLICT (action_key) DO NOTHING;

-- Function to consume credits with idempotency
CREATE OR REPLACE FUNCTION public.consume_funnel_credits(
  p_workspace_id UUID,
  p_user_id UUID,
  p_action_key TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, credits_consumed INTEGER, balance_remaining INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INTEGER;
  v_balance INTEGER;
  v_wallet_id UUID;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM credit_ledger WHERE idempotency_key = p_idempotency_key AND status = 'completed') THEN
      RETURN QUERY SELECT true, 0, 0, 'Already processed'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Get cost
  SELECT credits_cost INTO v_cost FROM credit_pricing_rules WHERE action_key = p_action_key AND is_active = true;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 'Unknown action'::TEXT;
    RETURN;
  END IF;

  -- Get or create wallet
  SELECT id, balance INTO v_wallet_id, v_balance FROM credit_wallets WHERE workspace_id = p_workspace_id FOR UPDATE;
  IF v_wallet_id IS NULL THEN
    INSERT INTO credit_wallets (workspace_id, balance) VALUES (p_workspace_id, 50)
    RETURNING id, balance INTO v_wallet_id, v_balance;
  END IF;

  -- Check balance
  IF v_balance < v_cost THEN
    RETURN QUERY SELECT false, v_cost, v_balance, 'Créditos insuficientes'::TEXT;
    RETURN;
  END IF;

  -- Debit
  UPDATE credit_wallets SET balance = balance - v_cost, updated_at = now() WHERE id = v_wallet_id;

  -- Log
  INSERT INTO credit_ledger (workspace_id, user_id, action_key, module, reference_type, reference_id, credits_amount, direction, status, idempotency_key, metadata)
  VALUES (p_workspace_id, p_user_id, p_action_key, 'funnels', p_reference_type, p_reference_id, v_cost, 'debit', 'completed', p_idempotency_key, p_metadata);

  RETURN QUERY SELECT true, v_cost, v_balance - v_cost, 'OK'::TEXT;
END;
$$;
