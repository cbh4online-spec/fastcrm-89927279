
-- =============================================
-- Purchase & Procurement Engine - Full Migration
-- =============================================

-- 1. Register module in Marketplace
INSERT INTO public.marketplace_modules (
  slug, name, tagline, description, category, status, publisher, icon, version,
  internal_type, pricing, permissions, is_featured, is_new,
  manifest_json
) VALUES (
  'procurement',
  'Purchase & Procurement',
  'Gestão completa de compras empresariais',
  'Módulo completo de compras: Fornecedores, Requisições internas, Ordens de Compra, Receção de mercadoria, Faturas de fornecedor e Dashboard financeiro.',
  'operations',
  'active',
  'FastCRM',
  'ShoppingCart',
  '1.0.0',
  'embedded',
  '{"model": "free", "price": 0}'::jsonb,
  '{"roles": ["owner", "admin", "agent"]}'::jsonb,
  true,
  true,
  '{
    "objects": [
      {"type": "supplier", "label": "Supplier", "labelPt": "Fornecedor", "icon": "Building2", "source_table": "suppliers", "color": "teal", "description": "Gestão de fornecedores"},
      {"type": "purchase_request", "label": "Purchase Request", "labelPt": "Requisição", "icon": "FileText", "source_table": "purchase_requests", "color": "amber", "description": "Requisições internas de compra"},
      {"type": "purchase_order", "label": "Purchase Order", "labelPt": "Ordem de Compra", "icon": "ShoppingCart", "source_table": "purchase_orders", "color": "blue", "description": "Ordens de compra a fornecedores"},
      {"type": "goods_receipt", "label": "Goods Receipt", "labelPt": "Receção", "icon": "Package", "source_table": "goods_receipts", "color": "green", "description": "Receção de mercadoria"},
      {"type": "supplier_invoice", "label": "Supplier Invoice", "labelPt": "Fatura Fornecedor", "icon": "Receipt", "source_table": "supplier_invoices", "color": "red", "description": "Faturas de fornecedor"}
    ],
    "feature_flags": ["procurement"]
  }'::jsonb
);

-- 2. Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  vat_number text,
  address text,
  payment_terms text DEFAULT '30 dias',
  iban text,
  email text,
  phone text,
  category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_workspace ON public.suppliers(workspace_id);

-- 3. Purchase Requests
CREATE TABLE public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  status text NOT NULL DEFAULT 'draft',
  total_estimated numeric DEFAULT 0,
  urgency text NOT NULL DEFAULT 'medium',
  cost_center text,
  notes text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_requests_workspace ON public.purchase_requests(workspace_id);

-- 4. Purchase Request Items
CREATE TABLE public.purchase_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  estimated_unit_price numeric DEFAULT 0
);

-- 5. Purchase Orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  request_id uuid REFERENCES public.purchase_requests(id),
  po_number text,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  expected_delivery date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_orders_workspace ON public.purchase_orders(workspace_id);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);

-- 6. Purchase Order Items
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0
);

-- 7. Goods Receipts
CREATE TABLE public.goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  received_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_goods_receipts_workspace ON public.goods_receipts(workspace_id);

-- 8. Goods Receipt Items
CREATE TABLE public.goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.purchase_order_items(id),
  quantity_received numeric NOT NULL DEFAULT 0
);

-- 9. Supplier Invoices
CREATE TABLE public.supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  invoice_number text,
  invoice_date date,
  due_date date,
  total numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  ocr_data_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_invoices_workspace ON public.supplier_invoices(workspace_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq int;
  year_str text;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM 9) AS integer)
  ), 0) + 1
  INTO next_seq
  FROM public.purchase_orders
  WHERE workspace_id = NEW.workspace_id
    AND po_number LIKE 'PO-' || year_str || '-%';
  
  NEW.po_number := 'PO-' || year_str || '-' || LPAD(next_seq::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_po_number
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION public.generate_po_number();

-- Auto-update received_quantity on PO items and stock
CREATE OR REPLACE FUNCTION public.process_goods_receipt_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_item RECORD;
  v_receipt RECORD;
  v_po RECORD;
  v_total_items int;
  v_fully_received int;
BEGIN
  -- Get order item info
  SELECT * INTO v_order_item FROM public.purchase_order_items WHERE id = NEW.order_item_id;
  
  -- Update received_quantity on PO item
  UPDATE public.purchase_order_items
  SET received_quantity = received_quantity + NEW.quantity_received
  WHERE id = NEW.order_item_id;
  
  -- Get receipt to find PO
  SELECT * INTO v_receipt FROM public.goods_receipts WHERE id = NEW.receipt_id;
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = v_receipt.purchase_order_id;
  
  -- Update stock if product tracked
  IF v_order_item.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock_quantity = COALESCE(stock_quantity, 0) + NEW.quantity_received
    WHERE id = v_order_item.product_id AND track_stock = true;
    
    -- Create inventory movement
    INSERT INTO public.inventory_movements (
      workspace_id, product_id, type, qty, source, ref_id, notes
    ) VALUES (
      v_po.workspace_id,
      v_order_item.product_id,
      'purchase_in',
      NEW.quantity_received,
      'goods_receipt',
      v_po.id::text,
      'Receção PO ' || COALESCE(v_po.po_number, '')
    );
  END IF;
  
  -- Update PO status based on reception
  SELECT COUNT(*) INTO v_total_items FROM public.purchase_order_items WHERE order_id = v_po.id;
  SELECT COUNT(*) INTO v_fully_received FROM public.purchase_order_items 
    WHERE order_id = v_po.id AND received_quantity >= quantity;
  
  IF v_fully_received >= v_total_items THEN
    UPDATE public.purchase_orders SET status = 'received', updated_at = now() WHERE id = v_po.id;
  ELSE
    UPDATE public.purchase_orders SET status = 'partial', updated_at = now() WHERE id = v_po.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_goods_receipt
  AFTER INSERT ON public.goods_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION public.process_goods_receipt_item();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Helper: check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member_procurement(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

-- Suppliers
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));

-- Purchase Requests
CREATE POLICY "pr_select" ON public.purchase_requests FOR SELECT TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "pr_insert" ON public.purchase_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "pr_update" ON public.purchase_requests FOR UPDATE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "pr_delete" ON public.purchase_requests FOR DELETE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));

-- Purchase Request Items
CREATE POLICY "pri_select" ON public.purchase_request_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.id = request_id AND (public.is_workspace_member_procurement(pr.workspace_id) OR public.is_super_admin(auth.uid()))));
CREATE POLICY "pri_insert" ON public.purchase_request_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.id = request_id AND public.is_workspace_member_procurement(pr.workspace_id)));
CREATE POLICY "pri_update" ON public.purchase_request_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.id = request_id AND public.is_workspace_member_procurement(pr.workspace_id)));
CREATE POLICY "pri_delete" ON public.purchase_request_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_requests pr WHERE pr.id = request_id AND (public.is_workspace_member_procurement(pr.workspace_id) OR public.is_super_admin(auth.uid()))));

-- Purchase Orders
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "po_insert" ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "po_update" ON public.purchase_orders FOR UPDATE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "po_delete" ON public.purchase_orders FOR DELETE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));

-- Purchase Order Items
CREATE POLICY "poi_select" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = order_id AND (public.is_workspace_member_procurement(po.workspace_id) OR public.is_super_admin(auth.uid()))));
CREATE POLICY "poi_insert" ON public.purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = order_id AND public.is_workspace_member_procurement(po.workspace_id)));
CREATE POLICY "poi_update" ON public.purchase_order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = order_id AND public.is_workspace_member_procurement(po.workspace_id)));
CREATE POLICY "poi_delete" ON public.purchase_order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = order_id AND (public.is_workspace_member_procurement(po.workspace_id) OR public.is_super_admin(auth.uid()))));

-- Goods Receipts
CREATE POLICY "gr_select" ON public.goods_receipts FOR SELECT TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "gr_insert" ON public.goods_receipts FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "gr_update" ON public.goods_receipts FOR UPDATE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "gr_delete" ON public.goods_receipts FOR DELETE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));

-- Goods Receipt Items
CREATE POLICY "gri_select" ON public.goods_receipt_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.goods_receipts gr WHERE gr.id = receipt_id AND (public.is_workspace_member_procurement(gr.workspace_id) OR public.is_super_admin(auth.uid()))));
CREATE POLICY "gri_insert" ON public.goods_receipt_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.goods_receipts gr WHERE gr.id = receipt_id AND public.is_workspace_member_procurement(gr.workspace_id)));
CREATE POLICY "gri_update" ON public.goods_receipt_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.goods_receipts gr WHERE gr.id = receipt_id AND public.is_workspace_member_procurement(gr.workspace_id)));
CREATE POLICY "gri_delete" ON public.goods_receipt_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.goods_receipts gr WHERE gr.id = receipt_id AND (public.is_workspace_member_procurement(gr.workspace_id) OR public.is_super_admin(auth.uid()))));

-- Supplier Invoices
CREATE POLICY "si_select" ON public.supplier_invoices FOR SELECT TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "si_insert" ON public.supplier_invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "si_update" ON public.supplier_invoices FOR UPDATE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id));
CREATE POLICY "si_delete" ON public.supplier_invoices FOR DELETE TO authenticated
  USING (public.is_workspace_member_procurement(workspace_id) OR public.is_super_admin(auth.uid()));
