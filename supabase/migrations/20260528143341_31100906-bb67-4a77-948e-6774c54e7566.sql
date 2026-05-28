
-- 1. Add external_id/external_provider columns
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_provider TEXT;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_provider TEXT;

-- Partial unique indexes (workspace + provider + external_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_external
  ON public.companies (workspace_id, external_provider, external_id)
  WHERE external_id IS NOT NULL AND external_provider IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_external
  ON public.contacts (workspace_id, external_provider, external_id)
  WHERE external_id IS NOT NULL AND external_provider IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_external
  ON public.invoices (workspace_id, external_provider, external_id)
  WHERE external_id IS NOT NULL AND external_provider IS NOT NULL;

-- 2. collection_imports
CREATE TABLE IF NOT EXISTS public.collection_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'artsoft',
  file_name TEXT NOT NULL,
  file_hash TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  reference_date DATE,
  uploaded_by UUID,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_imports TO authenticated;
GRANT ALL ON public.collection_imports TO service_role;

ALTER TABLE public.collection_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cim_workspace_all" ON public.collection_imports
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS idx_collection_imports_ws_created
  ON public.collection_imports (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_collection_imports_hash
  ON public.collection_imports (workspace_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- 3. collection_import_items
CREATE TABLE IF NOT EXISTS public.collection_import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.collection_imports(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'invoice',
  source_key TEXT,
  client_number TEXT,
  client_name TEXT,
  client_address TEXT,
  client_email TEXT,
  doc_type TEXT,
  doc_no TEXT,
  doc_third_no TEXT,
  doc_date DATE,
  due_date DATE,
  total NUMERIC(12,2),
  balance NUMERIC(12,2),
  matched_company_id UUID,
  matched_contact_id UUID,
  matched_invoice_id UUID,
  action TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_import_items TO authenticated;
GRANT ALL ON public.collection_import_items TO service_role;

ALTER TABLE public.collection_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cim_items_workspace_all" ON public.collection_import_items
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX IF NOT EXISTS idx_collection_import_items_import
  ON public.collection_import_items (import_id);
CREATE INDEX IF NOT EXISTS idx_collection_import_items_client_no
  ON public.collection_import_items (workspace_id, client_number);
CREATE INDEX IF NOT EXISTS idx_collection_import_items_action
  ON public.collection_import_items (import_id, action);

-- 4. Manual client mapping
CREATE TABLE IF NOT EXISTS public.collection_client_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'artsoft',
  client_number TEXT NOT NULL,
  client_name TEXT,
  company_id UUID,
  contact_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source, client_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_client_mappings TO authenticated;
GRANT ALL ON public.collection_client_mappings TO service_role;

ALTER TABLE public.collection_client_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cim_mappings_workspace_all" ON public.collection_client_mappings
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- 5. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('collections-imports', 'collections-imports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cim_storage_select" ON storage.objects;
CREATE POLICY "cim_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'collections-imports'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "cim_storage_insert" ON storage.objects;
CREATE POLICY "cim_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'collections-imports'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "cim_storage_delete" ON storage.objects;
CREATE POLICY "cim_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'collections-imports'
    AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 6. updated_at trigger
DROP TRIGGER IF EXISTS trg_collection_imports_updated_at ON public.collection_imports;
CREATE TRIGGER trg_collection_imports_updated_at
  BEFORE UPDATE ON public.collection_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
