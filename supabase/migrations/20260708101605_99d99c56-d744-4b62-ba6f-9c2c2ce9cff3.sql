
-- 1) collection_import_batches
CREATE TABLE public.collection_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source text NOT NULL,
  file_name text,
  file_hash text,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_import_batches TO authenticated;
GRANT ALL ON public.collection_import_batches TO service_role;

ALTER TABLE public.collection_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm_import_batches_all"
  ON public.collection_import_batches
  FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX cm_idx_import_batches_ws
  ON public.collection_import_batches (workspace_id, created_at DESC);
CREATE INDEX cm_idx_import_batches_status
  ON public.collection_import_batches (workspace_id, status);

-- 2) collection_documents
CREATE TABLE public.collection_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.collection_import_batches(id) ON DELETE SET NULL,
  import_key text NOT NULL,
  source text,
  external_id text,
  document_type text,
  document_number text,
  document_series text,
  client_name text,
  client_tax_id text,
  client_email text,
  client_phone text,
  client_external_id text,
  currency text NOT NULL DEFAULT 'EUR',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  open_amount numeric(14,2) NOT NULL DEFAULT 0,
  issue_date date,
  due_date date,
  overdue_days integer,
  status text NOT NULL DEFAULT 'open',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_documents_ws_import_key_uniq UNIQUE (workspace_id, import_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_documents TO authenticated;
GRANT ALL ON public.collection_documents TO service_role;

ALTER TABLE public.collection_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm_documents_all"
  ON public.collection_documents
  FOR ALL
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX cm_idx_documents_ws
  ON public.collection_documents (workspace_id, created_at DESC);
CREATE INDEX cm_idx_documents_ws_status
  ON public.collection_documents (workspace_id, status);
CREATE INDEX cm_idx_documents_ws_due
  ON public.collection_documents (workspace_id, due_date);
CREATE INDEX cm_idx_documents_batch
  ON public.collection_documents (batch_id);
CREATE INDEX cm_idx_documents_client_tax
  ON public.collection_documents (workspace_id, client_tax_id);

-- 3) collection_actions — estender tabela existente com referência opcional a documento
ALTER TABLE public.collection_actions
  ADD COLUMN IF NOT EXISTS document_id uuid
    REFERENCES public.collection_documents(id) ON DELETE CASCADE;

ALTER TABLE public.collection_actions
  ALTER COLUMN case_id DROP NOT NULL;

ALTER TABLE public.collection_actions
  DROP CONSTRAINT IF EXISTS collection_actions_case_or_document_chk;
ALTER TABLE public.collection_actions
  ADD CONSTRAINT collection_actions_case_or_document_chk
  CHECK (case_id IS NOT NULL OR document_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS cm_idx_actions_document
  ON public.collection_actions (document_id, created_at DESC);

-- Triggers updated_at (reutiliza função existente do projeto se presente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'CREATE TRIGGER update_collection_import_batches_updated_at
      BEFORE UPDATE ON public.collection_import_batches
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
    EXECUTE 'CREATE TRIGGER update_collection_documents_updated_at
      BEFORE UPDATE ON public.collection_documents
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;
