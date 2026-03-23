
-- =============================================================================
-- DOCUMENT INTELLIGENCE PRO: Tables + Storage + RLS
-- =============================================================================

-- Document Processing Jobs
CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  
  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_hash TEXT,
  
  -- Processing state
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- OCR results
  ocr_text TEXT,
  ocr_confidence DECIMAL(5,4),
  ocr_engine TEXT,
  ocr_pages INTEGER,
  ocr_duration_ms INTEGER,
  
  -- Classification results
  document_type TEXT,
  document_subtype TEXT,
  classification_confidence DECIMAL(5,4),
  classification_reasoning TEXT,
  
  -- Extraction results
  extracted_data JSONB DEFAULT '{}',
  extracted_entities JSONB DEFAULT '[]',
  extraction_schema TEXT,
  extraction_confidence DECIMAL(5,4),
  
  -- Knowledge Base integration
  knowledge_document_id UUID,
  indexed_at TIMESTAMPTZ,
  
  -- Metadata
  source TEXT DEFAULT 'upload',
  source_reference TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_docjobs_workspace ON public.document_processing_jobs(workspace_id);
CREATE INDEX idx_docjobs_status ON public.document_processing_jobs(status);
CREATE INDEX idx_docjobs_type ON public.document_processing_jobs(document_type);
CREATE INDEX idx_docjobs_created ON public.document_processing_jobs(created_at DESC);
CREATE INDEX idx_docjobs_file_hash ON public.document_processing_jobs(file_hash);
CREATE INDEX idx_docjobs_extracted_gin ON public.document_processing_jobs USING GIN (extracted_data);

-- RLS
ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace document jobs"
  ON public.document_processing_jobs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create document jobs in own workspace"
  ON public.document_processing_jobs FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own workspace document jobs"
  ON public.document_processing_jobs FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own workspace document jobs"
  ON public.document_processing_jobs FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Service role policy for edge functions
CREATE POLICY "Service role full access to document jobs"
  ON public.document_processing_jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Extraction Templates
CREATE TABLE IF NOT EXISTS public.document_extraction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  extraction_schema JSONB NOT NULL DEFAULT '{}',
  prompt_template TEXT,
  validation_rules JSONB DEFAULT '{}',
  required_fields TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,4),
  avg_confidence DECIMAL(5,4),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.document_extraction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage templates in own workspace"
  ON public.document_extraction_templates FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Updated_at trigger
CREATE TRIGGER update_document_processing_jobs_updated_at
  BEFORE UPDATE ON public.document_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_extraction_templates_updated_at
  BEFORE UPDATE ON public.document_extraction_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for document intelligence
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('document-intelligence', 'document-intelligence', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'document-intelligence');

CREATE POLICY "Users can view own workspace documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'document-intelligence');

CREATE POLICY "Users can delete own workspace documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'document-intelligence');

-- Enable realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_processing_jobs;
