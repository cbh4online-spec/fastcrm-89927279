
-- ============================================
-- Procurement Projects + RFQ Flow
-- ============================================

-- 1. procurement_projects
CREATE TABLE public.procurement_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'proposal',
  source_id uuid,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procurement_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage procurement_projects" ON public.procurement_projects
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_procurement_projects_workspace ON public.procurement_projects(workspace_id);
CREATE INDEX idx_procurement_projects_source ON public.procurement_projects(source_type, source_id);

-- 2. procurement_project_items
CREATE TABLE public.procurement_project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.procurement_projects(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid,
  description text,
  qty_sold numeric NOT NULL DEFAULT 0,
  qty_required numeric NOT NULL DEFAULT 0,
  qty_in_stock_at_creation numeric NOT NULL DEFAULT 0,
  qty_to_buy numeric NOT NULL DEFAULT 0,
  procurement_status text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procurement_project_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage procurement_project_items" ON public.procurement_project_items
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_procurement_project_items_project ON public.procurement_project_items(project_id);

-- 3. procurement_needs
CREATE TABLE public.procurement_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.procurement_projects(id) ON DELETE CASCADE,
  project_item_id uuid REFERENCES public.procurement_project_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid,
  qty_needed numeric NOT NULL DEFAULT 0,
  qty_available numeric NOT NULL DEFAULT 0,
  qty_to_buy numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procurement_needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage procurement_needs" ON public.procurement_needs
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_procurement_needs_project_status ON public.procurement_needs(project_id, status);

-- 4. rfqs
CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.procurement_projects(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage rfqs" ON public.rfqs
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_rfqs_workspace ON public.rfqs(workspace_id);

-- 5. rfq_items
CREATE TABLE public.rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid,
  qty numeric NOT NULL DEFAULT 0,
  spec_notes text,
  need_id uuid REFERENCES public.procurement_needs(id),
  preferred_supplier_id uuid REFERENCES public.suppliers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage rfq_items" ON public.rfq_items
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_rfq_items_rfq ON public.rfq_items(rfq_id);

-- 6. rfq_suppliers
CREATE TABLE public.rfq_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  status text NOT NULL DEFAULT 'invited',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage rfq_suppliers" ON public.rfq_suppliers
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 7. rfq_quotes
CREATE TABLE public.rfq_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  rfq_item_id uuid NOT NULL REFERENCES public.rfq_items(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  lead_time_days integer,
  min_order_qty numeric,
  pack_size numeric DEFAULT 1,
  notes text,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage rfq_quotes" ON public.rfq_quotes
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE INDEX idx_rfq_quotes_rfq_supplier ON public.rfq_quotes(rfq_id, supplier_id);

-- 8. Extend purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.procurement_projects(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS rfq_id uuid REFERENCES public.rfqs(id);

-- 9. Extend purchase_order_items
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS rfq_quote_id uuid REFERENCES public.rfq_quotes(id);
