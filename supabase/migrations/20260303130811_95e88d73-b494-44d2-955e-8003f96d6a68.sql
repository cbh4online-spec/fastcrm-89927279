
-- 1. Add missing columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_cost numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_purchase_date date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point int;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty int;

-- 2. Performance indices
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ws_status ON purchase_orders(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);

-- 3. Drop old triggers
DROP TRIGGER IF EXISTS trg_process_goods_receipt_item ON goods_receipt_items;
DROP TRIGGER IF EXISTS trg_process_goods_receipt_item_v2 ON goods_receipt_items;
DROP FUNCTION IF EXISTS process_goods_receipt_item() CASCADE;
DROP FUNCTION IF EXISTS process_goods_receipt_item_v2() CASCADE;

-- 4. Recreate correct trigger with actual column names: type, qty, source, ref_id
CREATE OR REPLACE FUNCTION process_goods_receipt_item_v3()
RETURNS TRIGGER AS $$
DECLARE
  v_order_item RECORD;
  v_workspace_id uuid;
  v_current_stock numeric;
  v_current_avg_cost numeric;
  v_new_avg_cost numeric;
BEGIN
  -- Get the PO item details
  SELECT poi.product_id, poi.variant_id, poi.unit_price, poi.order_id
  INTO v_order_item
  FROM purchase_order_items poi
  WHERE poi.id = NEW.order_item_id;

  IF v_order_item IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get workspace from the receipt
  SELECT gr.workspace_id INTO v_workspace_id
  FROM goods_receipts gr
  WHERE gr.id = NEW.receipt_id;

  -- Update received_quantity on purchase_order_items
  UPDATE purchase_order_items
  SET received_quantity = COALESCE(received_quantity, 0) + NEW.quantity_received
  WHERE id = NEW.order_item_id;

  -- Get current product stock and avg_cost
  SELECT COALESCE(stock_quantity, 0), COALESCE(avg_cost, 0)
  INTO v_current_stock, v_current_avg_cost
  FROM products
  WHERE id = v_order_item.product_id;

  -- Calculate new avg_cost
  IF (v_current_stock + NEW.quantity_received) > 0 THEN
    v_new_avg_cost := (v_current_stock * v_current_avg_cost + NEW.quantity_received * COALESCE(v_order_item.unit_price, 0))
                      / (v_current_stock + NEW.quantity_received);
  ELSE
    v_new_avg_cost := COALESCE(v_order_item.unit_price, 0);
  END IF;

  -- Update product stock + cost fields
  UPDATE products
  SET stock_quantity = COALESCE(stock_quantity, 0) + NEW.quantity_received,
      avg_cost = v_new_avg_cost,
      last_cost = COALESCE(v_order_item.unit_price, 0),
      last_purchase_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = v_order_item.product_id;

  -- Create inventory movement with correct column names
  INSERT INTO inventory_movements (workspace_id, product_id, variant_id, type, qty, unit_cost, source, ref_id)
  VALUES (v_workspace_id, v_order_item.product_id, v_order_item.variant_id, 'purchase_in', NEW.quantity_received, v_order_item.unit_price, 'purchase_order', v_order_item.order_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_process_goods_receipt_item_v3
AFTER INSERT ON goods_receipt_items
FOR EACH ROW
EXECUTE FUNCTION process_goods_receipt_item_v3();
