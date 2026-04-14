
CREATE OR REPLACE FUNCTION public.sync_renewal_contract_mrr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_contract_id uuid;
BEGIN
  target_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  
  UPDATE renewal_contracts
  SET total_mrr = COALESCE((
    SELECT SUM(unit_price * qty)
    FROM renewal_items
    WHERE contract_id = target_contract_id
      AND status IN ('active', 'pending_renewal')
  ), 0),
  updated_at = now()
  WHERE id = target_contract_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_renewal_contract_mrr ON public.renewal_items;

CREATE TRIGGER trg_sync_renewal_contract_mrr
AFTER INSERT OR UPDATE OR DELETE ON public.renewal_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_renewal_contract_mrr();
