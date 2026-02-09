
-- 1. Create product_deliverables table
CREATE TABLE public.product_deliverables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deliverable_type text NOT NULL, -- 'file', 'portal_access', 'course_enrollment', 'license_key'
  label text NOT NULL, -- Display name e.g. "Manual PDF", "Acesso Premium", "Curso X"
  config jsonb NOT NULL DEFAULT '{}',
  -- config examples:
  -- file: { "storage_path": "deliverables/xyz.pdf", "file_name": "manual.pdf", "file_size": 1024 }
  -- portal_access: { "entitlement_ids": ["uuid1"], "duration_days": 365 }
  -- course_enrollment: { "course_id": "uuid", "cohort_id": "uuid" }
  -- license_key: { "prefix": "FC", "max_activations": 3 }
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_deliverables_product ON public.product_deliverables(product_id);
CREATE INDEX idx_product_deliverables_workspace ON public.product_deliverables(workspace_id);

ALTER TABLE public.product_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage product deliverables"
  ON public.product_deliverables FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- Public read for store visitors (to show "includes digital download" etc.)
CREATE POLICY "Public can view active deliverables"
  ON public.product_deliverables FOR SELECT
  USING (is_active = true);

-- 2. Create order_deliveries table to track what was delivered per order
CREATE TABLE public.order_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES public.product_deliverables(id),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
  delivered_at timestamptz,
  delivery_data jsonb, -- result data: download_url, license_key generated, enrollment_id, etc.
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_deliveries_order ON public.order_deliveries(order_id);

ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view order deliveries"
  ON public.order_deliveries FOR ALL
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

-- 3. Storage bucket for digital deliverables
INSERT INTO storage.buckets (id, name, public) VALUES ('product-deliverables', 'product-deliverables', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies - workspace members can upload
CREATE POLICY "Workspace members can upload deliverables"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-deliverables' AND auth.role() = 'authenticated');

CREATE POLICY "Workspace members can view deliverables"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-deliverables' AND auth.role() = 'authenticated');

CREATE POLICY "Workspace members can delete deliverables"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-deliverables' AND auth.role() = 'authenticated');

-- 4. Trigger for updated_at
CREATE TRIGGER update_product_deliverables_updated_at
  BEFORE UPDATE ON public.product_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
