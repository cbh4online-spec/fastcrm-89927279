
-- workspace_plans: plano activo por workspace
CREATE TABLE workspace_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('free','growth','pro')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due')),
  calls_included  INT NOT NULL DEFAULT 0,
  calls_used      INT NOT NULL DEFAULT 0,
  cycle_start     TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_end       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  stripe_sub_id   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_plans_ws_status ON workspace_plans (workspace_id, status);

-- ai_call_log: registo de cada chamada IA
CREATE TABLE ai_call_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  edge_function   TEXT NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('micro','light','medium','heavy','agent')),
  model           TEXT NOT NULL DEFAULT 'gemini-3-flash',
  tokens_input    INT,
  tokens_output   INT,
  cost_eur        NUMERIC(10,6),
  is_overage      BOOLEAN NOT NULL DEFAULT false,
  overage_charge  NUMERIC(10,4),
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_call_log_ws_created ON ai_call_log (workspace_id, created_at DESC);
CREATE INDEX idx_ai_call_log_ws_overage ON ai_call_log (workspace_id, is_overage) WHERE is_overage = true;

-- overage_charges: cobranças acumuladas para Stripe
CREATE TABLE overage_charges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  plan_cycle_id   UUID NOT NULL REFERENCES workspace_plans(id),
  tier            TEXT NOT NULL CHECK (tier IN ('heavy','agent')),
  calls_count     INT NOT NULL DEFAULT 0,
  amount_eur      NUMERIC(10,4) NOT NULL DEFAULT 0,
  stripe_meter_id TEXT,
  billed          BOOLEAN NOT NULL DEFAULT false,
  billed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alterar workspace_settings
ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES workspace_plans(id),
  ADD COLUMN IF NOT EXISTS ai_calls_alert_threshold INT DEFAULT 80;

-- RLS
ALTER TABLE workspace_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE overage_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_plans_own" ON workspace_plans
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "ai_call_log_own" ON ai_call_log
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "overage_charges_own" ON overage_charges
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Dados padrão por plano
CREATE OR REPLACE FUNCTION get_plan_calls_included(plan_name TEXT)
RETURNS INT AS $$
BEGIN
  RETURN CASE plan_name
    WHEN 'free'   THEN 0
    WHEN 'growth' THEN 3000
    WHEN 'pro'    THEN 10000
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- RPC para upsert overage charge
CREATE OR REPLACE FUNCTION upsert_overage_charge(
  p_workspace_id UUID,
  p_plan_cycle_id UUID,
  p_tier TEXT,
  p_amount NUMERIC
)
RETURNS void AS $$
BEGIN
  INSERT INTO overage_charges (workspace_id, plan_cycle_id, tier, calls_count, amount_eur)
  VALUES (p_workspace_id, p_plan_cycle_id, p_tier, 1, p_amount)
  ON CONFLICT ON CONSTRAINT overage_charges_unique_cycle_tier
  DO UPDATE SET
    calls_count = overage_charges.calls_count + 1,
    amount_eur = overage_charges.amount_eur + p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add unique constraint for the upsert
ALTER TABLE overage_charges ADD CONSTRAINT overage_charges_unique_cycle_tier UNIQUE (plan_cycle_id, tier);
