
-- 1. supplier_price_imports table
CREATE TABLE public.supplier_price_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  file_url text,
  file_name text,
  file_type text,
  pricing_mode text NOT NULL DEFAULT 'NET_PRICE_ONLY',
  currency text NOT NULL DEFAULT 'EUR',
  global_discount_percent numeric,
  margin_percent numeric,
  base_price_field text,
  price_is_per_pack boolean NOT NULL DEFAULT false,
  mapping_json jsonb,
  stats_json jsonb,
  category_discounts_json jsonb,
  status text NOT NULL DEFAULT 'uploaded',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_price_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage supplier_price_imports"
  ON public.supplier_price_imports FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 2. supplier_price_import_rows table
CREATE TABLE public.supplier_price_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  import_id uuid NOT NULL REFERENCES public.supplier_price_imports(id) ON DELETE CASCADE,
  row_index int NOT NULL DEFAULT 0,
  raw_json jsonb,
  normalized_json jsonb,
  match_status text NOT NULL DEFAULT 'unmatched',
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  computed_unit_price numeric,
  computed_rrp_price numeric,
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_price_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can manage supplier_price_import_rows"
  ON public.supplier_price_import_rows FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_import_rows_import_status ON public.supplier_price_import_rows(import_id, match_status);

-- 3. Extend supplier_products
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS rrp_price numeric;
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS price_source text;
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES public.supplier_price_imports(id);
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.supplier_products ADD COLUMN IF NOT EXISTS category text;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON public.supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_id);

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-price-files', 'supplier-price-files', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workspace members can upload supplier price files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'supplier-price-files' AND (storage.foldername(name))[1] IN (SELECT wm.workspace_id::text FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can read supplier price files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'supplier-price-files' AND (storage.foldername(name))[1] IN (SELECT wm.workspace_id::text FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
