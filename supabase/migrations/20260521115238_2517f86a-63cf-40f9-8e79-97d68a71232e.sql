
-- =============================================================
-- SAF-T PT Importer: tables, columns, storage, RLS
-- =============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.saft_type AS ENUM ('billing','accounting','self_billing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.saft_import_status AS ENUM ('uploaded','analyzing','preview_ready','importing','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.saft_entity_type AS ENUM ('invoice','customer','product','payment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.saft_item_action AS ENUM ('created','updated','skipped_duplicate','merged','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Imports
CREATE TABLE IF NOT EXISTS public.saft_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_hash text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  saft_type public.saft_type,
  saft_version text,
  software_company text,
  software_id text,
  tax_registration_number text,
  fiscal_year int,
  period_start date,
  period_end date,
  status public.saft_import_status NOT NULL DEFAULT 'uploaded',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saft_imports_ws_filehash_idx
  ON public.saft_imports(workspace_id, file_hash);
CREATE INDEX IF NOT EXISTS saft_imports_ws_created_idx
  ON public.saft_imports(workspace_id, created_at DESC);

-- Items log
CREATE TABLE IF NOT EXISTS public.saft_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.saft_imports(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  entity_type public.saft_entity_type NOT NULL,
  source_key text NOT NULL,
  source_hash text,
  action public.saft_item_action NOT NULL,
  target_id uuid,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saft_import_items_import_idx
  ON public.saft_import_items(import_id, entity_type);
CREATE INDEX IF NOT EXISTS saft_import_items_ws_idx
  ON public.saft_import_items(workspace_id, created_at DESC);

-- Extend invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS saft_import_id uuid,
  ADD COLUMN IF NOT EXISTS saft_invoice_no text,
  ADD COLUMN IF NOT EXISTS saft_atcud text,
  ADD COLUMN IF NOT EXISTS saft_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_ws_saft_invoiceno_uidx
  ON public.invoices(workspace_id, saft_invoice_no)
  WHERE saft_invoice_no IS NOT NULL;

-- Extend invoice_payments
ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS saft_import_id uuid,
  ADD COLUMN IF NOT EXISTS saft_payment_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_payments_ws_saft_ref_uidx
  ON public.invoice_payments(invoice_id, saft_payment_ref)
  WHERE saft_payment_ref IS NOT NULL;

-- Extend contacts / companies / products
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS saft_import_id uuid;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS saft_import_id uuid;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS saft_import_id uuid,
  ADD COLUMN IF NOT EXISTS saft_product_code text;

CREATE INDEX IF NOT EXISTS products_ws_saft_code_idx
  ON public.products(workspace_id, saft_product_code)
  WHERE saft_product_code IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.saft_imports_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saft_imports_updated_at ON public.saft_imports;
CREATE TRIGGER trg_saft_imports_updated_at
  BEFORE UPDATE ON public.saft_imports
  FOR EACH ROW EXECUTE FUNCTION public.saft_imports_set_updated_at();

-- RLS
ALTER TABLE public.saft_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saft_import_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ws members read saft_imports" ON public.saft_imports;
CREATE POLICY "ws members read saft_imports"
  ON public.saft_imports FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "ws members insert saft_imports" ON public.saft_imports;
CREATE POLICY "ws members insert saft_imports"
  ON public.saft_imports FOR INSERT
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "ws members update own saft_imports cancel" ON public.saft_imports;
CREATE POLICY "ws members update own saft_imports cancel"
  ON public.saft_imports FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "ws members read saft_import_items" ON public.saft_import_items;
CREATE POLICY "ws members read saft_import_items"
  ON public.saft_import_items FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('saft-imports','saft-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: files stored under <workspace_id>/<import_id>/<file>
DROP POLICY IF EXISTS "saft members read storage" ON storage.objects;
CREATE POLICY "saft members read storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'saft-imports'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "saft members insert storage" ON storage.objects;
CREATE POLICY "saft members insert storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'saft-imports'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "saft members delete storage" ON storage.objects;
CREATE POLICY "saft members delete storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'saft-imports'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );
