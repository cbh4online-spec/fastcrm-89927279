-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to knowledge_entries
ALTER TABLE knowledge_entries 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity searches (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS knowledge_entries_embedding_idx 
ON knowledge_entries 
USING hnsw (embedding vector_cosine_ops);

-- Create function to match knowledge entries by semantic similarity
CREATE OR REPLACE FUNCTION match_knowledge_entries(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_workspace_id uuid DEFAULT NULL,
  filter_knowledge_base_id uuid DEFAULT NULL,
  filter_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  knowledge_base_id uuid,
  title text,
  question text,
  content text,
  entry_type text,
  category text,
  status text,
  keywords text[],
  usage_count int,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.knowledge_base_id,
    ke.title,
    ke.question,
    ke.content,
    ke.entry_type,
    ke.category,
    ke.status,
    ke.keywords,
    ke.usage_count,
    ke.created_at,
    1 - (ke.embedding <=> query_embedding) as similarity
  FROM knowledge_entries ke
  WHERE 
    ke.embedding IS NOT NULL
    AND (filter_workspace_id IS NULL OR ke.workspace_id = filter_workspace_id)
    AND (filter_knowledge_base_id IS NULL OR ke.knowledge_base_id = filter_knowledge_base_id)
    AND (filter_status IS NULL OR ke.status = filter_status)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;