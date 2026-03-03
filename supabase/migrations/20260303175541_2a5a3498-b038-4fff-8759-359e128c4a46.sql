
-- Trigger to auto-recalculate total_mrr on renewal_contracts when items change
CREATE OR REPLACE FUNCTION public.recalculate_renewal_mrr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_new_mrr numeric;
BEGIN
  -- Determine which contract was affected
  IF TG_OP = 'DELETE' THEN
    v_contract_id := OLD.contract_id;
  ELSE
    v_contract_id := NEW.contract_id;
  END IF;

  -- Calculate MRR: normalize all intervals to monthly
  SELECT COALESCE(SUM(
    CASE 
      WHEN status IN ('active', 'pending_renewal') THEN
        (qty * unit_price) * 
        CASE renewal_interval
          WHEN 'monthly' THEN 1
          WHEN 'quarterly' THEN 1.0/3
          WHEN 'semi_annual' THEN 1.0/6
          WHEN 'yearly' THEN 1.0/12
          ELSE 1
        END
      ELSE 0
    END
  ), 0)
  INTO v_new_mrr
  FROM public.renewal_items
  WHERE contract_id = v_contract_id;

  UPDATE public.renewal_contracts
  SET total_mrr = v_new_mrr, updated_at = now()
  WHERE id = v_contract_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_recalculate_mrr ON public.renewal_items;

-- Create trigger on renewal_items
CREATE TRIGGER trg_recalculate_mrr
AFTER INSERT OR UPDATE OR DELETE ON public.renewal_items
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_renewal_mrr();
