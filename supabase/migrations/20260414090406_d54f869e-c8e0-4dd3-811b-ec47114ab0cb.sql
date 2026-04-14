
-- 1. Tabela de descontos
CREATE TABLE public.renewal_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES renewal_contracts(id) ON DELETE CASCADE,
  renewal_item_id uuid REFERENCES renewal_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(12,2) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  max_cycles integer,
  cycles_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices
CREATE INDEX idx_renewal_discounts_contract ON public.renewal_discounts(contract_id);
CREATE INDEX idx_renewal_discounts_active ON public.renewal_discounts(contract_id, is_active) WHERE is_active = true;

-- 3. RLS
ALTER TABLE public.renewal_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view discounts"
ON public.renewal_discounts FOR SELECT
TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Members can create discounts"
ON public.renewal_discounts FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Members can update discounts"
ON public.renewal_discounts FOR UPDATE
TO authenticated
USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can delete discounts"
ON public.renewal_discounts FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 4. Trigger updated_at
CREATE TRIGGER update_renewal_discounts_updated_at
BEFORE UPDATE ON public.renewal_discounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Atualizar sync_renewal_contract_mrr para considerar descontos
CREATE OR REPLACE FUNCTION public.sync_renewal_contract_mrr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_contract_id uuid;
  base_mrr numeric(12,2);
  total_pct_discount numeric(12,2);
  total_fixed_discount numeric(12,2);
  effective_mrr numeric(12,2);
BEGIN
  -- Determinar o contract_id afetado
  IF TG_TABLE_NAME = 'renewal_discounts' THEN
    target_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  ELSE
    target_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  END IF;
  
  -- Calcular MRR base dos itens ativos
  SELECT COALESCE(SUM(unit_price * qty), 0)
  INTO base_mrr
  FROM renewal_items
  WHERE contract_id = target_contract_id
    AND status IN ('active', 'pending_renewal');
  
  -- Calcular descontos percentuais ativos
  SELECT COALESCE(SUM(discount_value), 0)
  INTO total_pct_discount
  FROM renewal_discounts
  WHERE contract_id = target_contract_id
    AND is_active = true
    AND discount_type = 'percentage'
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND (max_cycles IS NULL OR cycles_used < max_cycles);
  
  -- Calcular descontos fixos ativos
  SELECT COALESCE(SUM(discount_value), 0)
  INTO total_fixed_discount
  FROM renewal_discounts
  WHERE contract_id = target_contract_id
    AND is_active = true
    AND discount_type = 'fixed_amount'
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND (max_cycles IS NULL OR cycles_used < max_cycles);
  
  -- Aplicar descontos: percentagem primeiro, depois fixo
  effective_mrr := base_mrr * (1 - LEAST(total_pct_discount, 100) / 100) - total_fixed_discount;
  effective_mrr := GREATEST(effective_mrr, 0);
  
  UPDATE renewal_contracts
  SET total_mrr = effective_mrr,
      updated_at = now()
  WHERE id = target_contract_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Trigger nos descontos para recalcular MRR
DROP TRIGGER IF EXISTS trg_sync_mrr_on_discount ON public.renewal_discounts;

CREATE TRIGGER trg_sync_mrr_on_discount
AFTER INSERT OR UPDATE OR DELETE ON public.renewal_discounts
FOR EACH ROW
EXECUTE FUNCTION public.sync_renewal_contract_mrr();
