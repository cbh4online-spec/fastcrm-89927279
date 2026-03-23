
-- Add enhanced columns to product_price_history
ALTER TABLE product_price_history
  ADD COLUMN IF NOT EXISTS old_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS new_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS changed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS change_type TEXT DEFAULT 'manual';

-- Create trigger to auto-record price changes
CREATE OR REPLACE FUNCTION record_product_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
    INSERT INTO product_price_history (
      workspace_id, product_id, price, compare_at_price,
      old_price, new_price, changed_by, reason, change_type
    ) VALUES (
      NEW.workspace_id, NEW.id, NEW.base_price, OLD.base_price,
      OLD.base_price, NEW.base_price, auth.uid(), 'Atualização de preço', 'auto'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_price_change ON products;
CREATE TRIGGER trg_record_price_change
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.base_price IS DISTINCT FROM NEW.base_price)
  EXECUTE FUNCTION record_product_price_change();
