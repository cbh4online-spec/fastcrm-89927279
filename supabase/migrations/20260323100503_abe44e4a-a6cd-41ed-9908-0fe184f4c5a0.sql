
-- Product Documents table
CREATE TABLE public.product_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('datasheet', 'manual', 'certificate', 'video', 'cad_file', 'other')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  language TEXT DEFAULT 'pt',
  version TEXT DEFAULT '1.0',
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'public')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_docs_product ON public.product_documents(product_id, type) WHERE visibility = 'public';
CREATE INDEX idx_product_docs_workspace ON public.product_documents(workspace_id);

ALTER TABLE public.product_documents ENABLE ROW LEVEL SECURITY;

-- Workspace members full access
CREATE POLICY "Workspace members manage product documents"
ON public.product_documents
FOR ALL TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Public read for store/B2B
CREATE POLICY "Public can read public product documents"
ON public.product_documents
FOR SELECT TO anon
USING (visibility = 'public');

-- Storage bucket for product documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-documents',
  'product-documents',
  true,
  52428800,
  ARRAY['application/pdf', 'video/mp4', 'video/webm', 'video/quicktime', 'application/step', 'application/iges', 'application/sla', 'model/stl', 'application/dxf', 'image/vnd.dwg', 'application/octet-stream', 'application/zip']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Authenticated users can upload product documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-documents');

CREATE POLICY "Anyone can read product documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-documents');

CREATE POLICY "Authenticated users can delete product documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-documents');
