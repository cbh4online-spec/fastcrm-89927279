
-- Enable pgvector extension in extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add document_count and chunk_count to knowledge_bases
ALTER TABLE public.knowledge_bases 
  ADD COLUMN IF NOT EXISTS document_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_count integer NOT NULL DEFAULT 0;

-- Knowledge Documents table
CREATE TABLE public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text,
  file_type text,
  file_size bigint,
  source_url text,
  raw_text text,
  chunk_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Knowledge Chunks table with vector embedding
CREATE TABLE public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  chunk_index integer NOT NULL DEFAULT 0,
  token_count integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- HNSW index for vector similarity search
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);

-- Standard indexes
CREATE INDEX idx_knowledge_documents_workspace ON public.knowledge_documents(workspace_id);
CREATE INDEX idx_knowledge_documents_kb ON public.knowledge_documents(knowledge_base_id);
CREATE INDEX idx_knowledge_documents_status ON public.knowledge_documents(status);
CREATE INDEX idx_knowledge_chunks_document ON public.knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_kb ON public.knowledge_chunks(knowledge_base_id);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_documents
CREATE POLICY "Users can view knowledge_documents in their workspace"
  ON public.knowledge_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_documents.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can insert knowledge_documents in their workspace"
  ON public.knowledge_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_documents.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can update knowledge_documents in their workspace"
  ON public.knowledge_documents FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_documents.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can delete knowledge_documents in their workspace"
  ON public.knowledge_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_documents.workspace_id AND wm.user_id = auth.uid()));

-- RLS policies for knowledge_chunks
CREATE POLICY "Users can view knowledge_chunks in their workspace"
  ON public.knowledge_chunks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_chunks.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can insert knowledge_chunks in their workspace"
  ON public.knowledge_chunks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_chunks.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "Users can delete knowledge_chunks in their workspace"
  ON public.knowledge_chunks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = knowledge_chunks.workspace_id AND wm.user_id = auth.uid()));

-- Updated_at trigger for knowledge_documents
CREATE OR REPLACE FUNCTION public.update_knowledge_documents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_documents_updated_at();

-- Sync document chunk_count
CREATE OR REPLACE FUNCTION public.sync_knowledge_document_chunk_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE doc_id uuid;
BEGIN
  doc_id := COALESCE(NEW.document_id, OLD.document_id);
  UPDATE public.knowledge_documents SET chunk_count = (SELECT count(*) FROM public.knowledge_chunks WHERE document_id = doc_id) WHERE id = doc_id;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_sync_document_chunk_count
  AFTER INSERT OR DELETE ON public.knowledge_chunks FOR EACH ROW
  EXECUTE FUNCTION public.sync_knowledge_document_chunk_count();

-- Sync knowledge_base counts
CREATE OR REPLACE FUNCTION public.sync_knowledge_base_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE kb_id uuid;
BEGIN
  kb_id := COALESCE(NEW.knowledge_base_id, OLD.knowledge_base_id);
  UPDATE public.knowledge_bases SET
    document_count = (SELECT count(*) FROM public.knowledge_documents WHERE knowledge_base_id = kb_id),
    chunk_count = (SELECT count(*) FROM public.knowledge_chunks WHERE knowledge_base_id = kb_id)
  WHERE id = kb_id;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_sync_kb_counts_on_docs
  AFTER INSERT OR DELETE ON public.knowledge_documents FOR EACH ROW
  EXECUTE FUNCTION public.sync_knowledge_base_counts();

CREATE TRIGGER trg_sync_kb_counts_on_chunks
  AFTER INSERT OR DELETE ON public.knowledge_chunks FOR EACH ROW
  EXECUTE FUNCTION public.sync_knowledge_base_counts();

-- RPC for vector similarity search
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  p_query_embedding vector(1536),
  p_knowledge_base_id uuid,
  p_workspace_id uuid,
  p_match_threshold float DEFAULT 0.5,
  p_match_count int DEFAULT 10
)
RETURNS TABLE (id uuid, document_id uuid, content text, chunk_index int, token_count int, metadata jsonb, similarity float)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT kc.id, kc.document_id, kc.content, kc.chunk_index, kc.token_count, kc.metadata,
    1 - (kc.embedding <=> p_query_embedding)::float AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.workspace_id = p_workspace_id
    AND kc.knowledge_base_id = p_knowledge_base_id
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY kc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END; $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-documents', 'knowledge-documents', false) ON CONFLICT (id) DO NOTHING;

-- Enable realtime for status tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_documents;
