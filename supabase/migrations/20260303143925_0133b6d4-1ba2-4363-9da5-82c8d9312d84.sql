
-- 1) Evolve procurement_needs: make project_id nullable, add comprehensive demand columns
ALTER TABLE public.procurement_needs
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.procurement_needs
  ADD COLUMN IF NOT EXISTS demand_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_on_hand numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_allocated numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_available numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shortage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earliest_due_date date,
  ADD COLUMN IF NOT EXISTS demand_sources_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS suggested_unit_price numeric,
  ADD COLUMN IF NOT EXISTS suggestion_json jsonb,
  ADD COLUMN IF NOT EXISTS last_computed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS priority_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_value numeric DEFAULT 0;

-- Update status column to support new statuses (it's text, so just document the enum)
COMMENT ON COLUMN public.procurement_needs.status IS 'open | rfq_in_progress | ordered | partially_received | resolved | ignored';

-- Add unique constraint for product/variant per workspace (for board aggregation)
CREATE UNIQUE INDEX IF NOT EXISTS procurement_needs_product_workspace_uniq
  ON public.procurement_needs (workspace_id, product_id, variant_id)
  WHERE project_id IS NULL;

-- 2) Create stock_allocations table
CREATE TABLE IF NOT EXISTS public.stock_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  source_type text NOT NULL, -- 'proposal', 'order_note', 'project'
  source_id uuid NOT NULL,
  qty_allocated numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_allocations_workspace_product_idx
  ON public.stock_allocations (workspace_id, product_id);

-- 3) Enable realtime for procurement_needs
ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_needs;

-- 4) RLS for procurement_needs (already has RLS enabled, add policies if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procurement_needs' AND policyname = 'workspace_members_select_needs') THEN
    CREATE POLICY workspace_members_select_needs ON public.procurement_needs
      FOR SELECT TO authenticated
      USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procurement_needs' AND policyname = 'workspace_members_all_needs') THEN
    CREATE POLICY workspace_members_all_needs ON public.procurement_needs
      FOR ALL TO authenticated
      USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
      WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 5) RLS for stock_allocations
ALTER TABLE public.stock_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_members_select_allocations ON public.stock_allocations
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY workspace_members_all_allocations ON public.stock_allocations
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Super admin bypass
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_allocations' AND policyname = 'super_admin_all_allocations') THEN
    CREATE POLICY super_admin_all_allocations ON public.stock_allocations
      FOR ALL TO authenticated
      USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procurement_needs' AND policyname = 'super_admin_all_needs') THEN
    CREATE POLICY super_admin_all_needs ON public.procurement_needs
      FOR ALL TO authenticated
      USING (public.is_super_admin(auth.uid()));
  END IF;
END $$;
