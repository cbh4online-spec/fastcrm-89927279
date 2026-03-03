
-- 1.2 Create supplier_products (products table already extended by prior partial migration)
CREATE TABLE IF NOT EXISTS supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  supplier_sku text,
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  min_order_qty numeric NOT NULL DEFAULT 1,
  pack_size numeric NOT NULL DEFAULT 1,
  lead_time_days int,
  last_price_date date,
  is_preferred boolean NOT NULL DEFAULT false,
  quality_score numeric(2,1),
  reliability_score numeric(2,1),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_products_combo
  ON supplier_products (workspace_id, supplier_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage supplier_products"
  ON supplier_products FOR ALL
  TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 1.3 Extend purchase_request_items (if not already done)
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id);
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS suggested_supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS suggested_unit_price numeric;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS suggestion_json jsonb;
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS chosen_supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE purchase_request_items ADD COLUMN IF NOT EXISTS chosen_unit_price numeric;

-- 1.4 Extend purchase_order_items
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id);

-- 1.5 Extend suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS default_payment_terms_days int DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating_manual numeric(2,1);

-- 1.6 Extend inventory_movements
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS unit_cost numeric;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES product_variants(id);

-- 1.7 Improved trigger for goods receipt cost tracking
CREATE OR REPLACE FUNCTION process_goods_receipt_item_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id uuid;
  v_unit_price numeric;
  v_current_stock numeric;
  v_current_avg numeric;
  v_new_avg numeric;
  v_workspace_id uuid;
BEGIN
  SELECT poi.product_id, poi.unit_price, po.workspace_id
  INTO v_product_id, v_unit_price, v_workspace_id
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.order_id
  WHERE poi.id = NEW.order_item_id;

  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE purchase_order_items
  SET received_quantity = COALESCE(received_quantity, 0) + NEW.quantity_received
  WHERE id = NEW.order_item_id;

  SELECT COALESCE(stock_quantity, 0), COALESCE(avg_cost, 0)
  INTO v_current_stock, v_current_avg
  FROM products WHERE id = v_product_id;

  IF (v_current_stock + NEW.quantity_received) > 0 THEN
    v_new_avg := (v_current_stock * v_current_avg + NEW.quantity_received * COALESCE(v_unit_price, 0))
                 / (v_current_stock + NEW.quantity_received);
  ELSE
    v_new_avg := COALESCE(v_unit_price, 0);
  END IF;

  UPDATE products SET
    stock_quantity = COALESCE(stock_quantity, 0) + NEW.quantity_received,
    avg_cost = v_new_avg,
    last_cost = COALESCE(v_unit_price, 0),
    last_purchase_date = CURRENT_DATE,
    updated_at = now()
  WHERE id = v_product_id;

  INSERT INTO inventory_movements (workspace_id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id)
  VALUES (v_workspace_id, v_product_id, 'purchase_in', NEW.quantity_received, v_unit_price, 'purchase_order', NEW.order_item_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_process_goods_receipt_item ON goods_receipt_items;
DROP TRIGGER IF EXISTS trg_process_goods_receipt_item_v2 ON goods_receipt_items;
CREATE TRIGGER trg_process_goods_receipt_item_v2
  AFTER INSERT ON goods_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION process_goods_receipt_item_v2();
