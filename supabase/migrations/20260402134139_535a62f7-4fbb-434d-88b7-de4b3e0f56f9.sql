
-- ============================================================
-- 1. NEW TABLE: supplier_import_profiles
-- ============================================================
CREATE TABLE public.supplier_import_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  file_type_hint TEXT,
  delimiter_hint TEXT,
  encoding_hint TEXT DEFAULT 'utf-8',
  mapping_json JSONB DEFAULT '{}'::jsonb,
  pricing_mode TEXT NOT NULL DEFAULT 'NET_PRICE_ONLY',
  global_discount_percent NUMERIC(5,2) DEFAULT 0,
  margin_percent NUMERIC(5,2) DEFAULT 0,
  base_price_field TEXT DEFAULT 'unit_price',
  price_is_per_pack BOOLEAN NOT NULL DEFAULT false,
  category_discounts_json JSONB DEFAULT '[]'::jsonb,
  matching_strategy_json JSONB DEFAULT '{}'::jsonb,
  normalization_rules_json JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_import_profiles_workspace ON public.supplier_import_profiles(workspace_id);
CREATE INDEX idx_supplier_import_profiles_supplier ON public.supplier_import_profiles(supplier_id);

ALTER TABLE public.supplier_import_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can select import profiles"
  ON public.supplier_import_profiles FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert import profiles"
  ON public.supplier_import_profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update import profiles"
  ON public.supplier_import_profiles FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete import profiles"
  ON public.supplier_import_profiles FOR DELETE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================================
-- 2. NEW TABLE: supplier_product_aliases
-- ============================================================
CREATE TABLE public.supplier_product_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  alias_type TEXT NOT NULL DEFAULT 'sku',
  alias_value_raw TEXT NOT NULL,
  alias_value_normalized TEXT NOT NULL,
  confidence_source TEXT DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_product_aliases_lookup 
  ON public.supplier_product_aliases(workspace_id, supplier_id, alias_type, alias_value_normalized);
CREATE INDEX idx_supplier_product_aliases_product 
  ON public.supplier_product_aliases(product_id);

ALTER TABLE public.supplier_product_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can select product aliases"
  ON public.supplier_product_aliases FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can insert product aliases"
  ON public.supplier_product_aliases FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update product aliases"
  ON public.supplier_product_aliases FOR UPDATE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete product aliases"
  ON public.supplier_product_aliases FOR DELETE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- ============================================================
-- 3. EVOLVE: supplier_price_imports
-- ============================================================
ALTER TABLE public.supplier_price_imports
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.supplier_import_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_checksum TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parsed_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unmatched_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

-- ============================================================
-- 4. EVOLVE: supplier_price_import_rows
-- ============================================================
ALTER TABLE public.supplier_price_import_rows
  ADD COLUMN IF NOT EXISTS parse_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS parse_error_text TEXT,
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS validation_error_text TEXT,
  ADD COLUMN IF NOT EXISTS match_method TEXT,
  ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS matched_supplier_product_id UUID REFERENCES public.supplier_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_key TEXT,
  ADD COLUMN IF NOT EXISTS pricing_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS computed_discount_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commit_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commit_error_text TEXT,
  ADD COLUMN IF NOT EXISTS row_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_import_rows_import ON public.supplier_price_import_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_match_status ON public.supplier_price_import_rows(match_status);

-- ============================================================
-- 5. EVOLVE: supplier_products
-- ============================================================
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS supplier_sku_normalized TEXT,
  ADD COLUMN IF NOT EXISTS barcode_normalized TEXT,
  ADD COLUMN IF NOT EXISTS supplier_product_name_raw TEXT,
  ADD COLUMN IF NOT EXISTS supplier_product_name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS match_method TEXT,
  ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS match_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_import_job_id UUID,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_price_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_unit_price NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS previous_rrp_price NUMERIC(12,4);

CREATE INDEX IF NOT EXISTS idx_supplier_products_sku_norm 
  ON public.supplier_products(workspace_id, supplier_id, supplier_sku_normalized);
CREATE INDEX IF NOT EXISTS idx_supplier_products_barcode_norm 
  ON public.supplier_products(workspace_id, barcode_normalized);

-- ============================================================
-- 6. Trigger for updated_at on supplier_import_profiles
-- ============================================================
CREATE OR REPLACE TRIGGER update_supplier_import_profiles_updated_at
  BEFORE UPDATE ON public.supplier_import_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
