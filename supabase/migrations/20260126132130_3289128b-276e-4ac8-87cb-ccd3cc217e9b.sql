-- =====================================================
-- RAG LAYER - RETRIEVAL-AUGMENTED REASONING
-- =====================================================

-- Tabela principal de outcomes históricos
CREATE TABLE IF NOT EXISTS rag_historical_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL,
  source_entity_type TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost', 'stalled', 'converted', 'churned')),
  outcome_reason TEXT,
  outcome_value NUMERIC,
  outcome_date TIMESTAMP WITH TIME ZONE,
  entity_snapshot JSONB NOT NULL DEFAULT '{}',
  industry TEXT,
  company_size TEXT,
  deal_cycle_days INTEGER,
  initial_stage TEXT,
  final_stage TEXT,
  success_factors TEXT[],
  failure_factors TEXT[],
  lessons_learned TEXT,
  embedding vector(1536),
  embedding_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  indexed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de chunks indexados para retrieval
CREATE TABLE IF NOT EXISTS rag_indexed_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  chunk_metadata JSONB DEFAULT '{}',
  quality_score NUMERIC DEFAULT 1.0,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_table, source_id, chunk_index)
);

-- Tabela de métricas de retrieval
CREATE TABLE IF NOT EXISTS rag_retrieval_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  query_type TEXT NOT NULL,
  chunks_retrieved INTEGER,
  chunks_used INTEGER,
  avg_relevance_score NUMERIC,
  retrieval_time_ms INTEGER,
  context_tokens_used INTEGER,
  query_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rag_outcomes_workspace ON rag_historical_outcomes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rag_outcomes_type ON rag_historical_outcomes(workspace_id, outcome);
CREATE INDEX IF NOT EXISTS idx_rag_outcomes_entity ON rag_historical_outcomes(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_rag_outcomes_date ON rag_historical_outcomes(workspace_id, outcome_date DESC);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_indexed_chunks(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_workspace ON rag_indexed_chunks(workspace_id);

CREATE INDEX IF NOT EXISTS idx_rag_metrics_lookup ON rag_retrieval_metrics(workspace_id, agent_type, query_date);

-- Índices HNSW para similarity search
CREATE INDEX IF NOT EXISTS idx_rag_outcomes_embedding ON rag_historical_outcomes 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_indexed_chunks 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- =====================================================
-- FUNÇÕES DE SIMILARITY SEARCH
-- =====================================================

-- Função para buscar outcomes históricos similares
CREATE OR REPLACE FUNCTION match_historical_outcomes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_workspace_id uuid,
  filter_outcome text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_entity_id uuid,
  source_entity_type text,
  outcome text,
  outcome_reason text,
  outcome_value numeric,
  entity_snapshot jsonb,
  success_factors text[],
  failure_factors text[],
  lessons_learned text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ho.id,
    ho.source_entity_id,
    ho.source_entity_type,
    ho.outcome,
    ho.outcome_reason,
    ho.outcome_value,
    ho.entity_snapshot,
    ho.success_factors,
    ho.failure_factors,
    ho.lessons_learned,
    1 - (ho.embedding <-> query_embedding) as similarity
  FROM rag_historical_outcomes ho
  WHERE ho.workspace_id = filter_workspace_id
    AND ho.embedding IS NOT NULL
    AND (filter_outcome IS NULL OR ho.outcome = filter_outcome)
    AND 1 - (ho.embedding <-> query_embedding) > match_threshold
  ORDER BY ho.embedding <-> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para busca híbrida (semântica + keyword)
CREATE OR REPLACE FUNCTION rag_hybrid_search(
  query_text text,
  query_embedding vector(1536),
  filter_workspace_id uuid,
  semantic_weight float DEFAULT 0.6,
  keyword_weight float DEFAULT 0.25,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  chunk_content text,
  chunk_metadata jsonb,
  semantic_score float,
  keyword_score float,
  combined_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT 
      c.source_table,
      c.source_id,
      c.chunk_content,
      c.chunk_metadata,
      1 - (c.embedding <-> query_embedding) as semantic_score
    FROM rag_indexed_chunks c
    WHERE c.workspace_id = filter_workspace_id
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <-> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT
      c.source_table,
      c.source_id,
      c.chunk_content,
      c.chunk_metadata,
      ts_rank(to_tsvector('portuguese', c.chunk_content), plainto_tsquery('portuguese', query_text)) as keyword_score
    FROM rag_indexed_chunks c
    WHERE c.workspace_id = filter_workspace_id
      AND to_tsvector('portuguese', c.chunk_content) @@ plainto_tsquery('portuguese', query_text)
    ORDER BY keyword_score DESC
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(s.source_table, k.source_table) as source_table,
    COALESCE(s.source_id, k.source_id) as source_id,
    COALESCE(s.chunk_content, k.chunk_content) as chunk_content,
    COALESCE(s.chunk_metadata, k.chunk_metadata) as chunk_metadata,
    COALESCE(s.semantic_score, 0)::float as semantic_score,
    COALESCE(k.keyword_score, 0)::float as keyword_score,
    (COALESCE(s.semantic_score, 0) * semantic_weight + 
     COALESCE(k.keyword_score, 0) * keyword_weight)::float as combined_score
  FROM semantic_results s
  FULL OUTER JOIN keyword_results k 
    ON s.source_table = k.source_table AND s.source_id = k.source_id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE rag_historical_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_indexed_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_retrieval_metrics ENABLE ROW LEVEL SECURITY;

-- Policies para outcomes
CREATE POLICY "Workspace members can view outcomes" ON rag_historical_outcomes
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can insert outcomes" ON rag_historical_outcomes
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can update outcomes" ON rag_historical_outcomes
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Policies para chunks
CREATE POLICY "Workspace members can view chunks" ON rag_indexed_chunks
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can insert chunks" ON rag_indexed_chunks
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can update chunks" ON rag_indexed_chunks
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Policies para métricas
CREATE POLICY "Workspace members can view metrics" ON rag_retrieval_metrics
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Service can insert metrics" ON rag_retrieval_metrics
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- TRIGGER PARA INDEXAR OUTCOMES AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION index_opportunity_outcome()
RETURNS TRIGGER AS $$
BEGIN
  -- Só processa quando status muda para won/lost
  IF NEW.status IN ('won', 'lost') AND (OLD.status IS NULL OR OLD.status NOT IN ('won', 'lost')) THEN
    INSERT INTO rag_historical_outcomes (
      workspace_id,
      source_entity_id,
      source_entity_type,
      outcome,
      outcome_reason,
      outcome_value,
      outcome_date,
      entity_snapshot,
      final_stage
    ) VALUES (
      NEW.workspace_id,
      NEW.id,
      'opportunity',
      NEW.status,
      NEW.lost_reason,
      NEW.value,
      now(),
      jsonb_build_object(
        'title', NEW.title,
        'value', NEW.value,
        'probability', NEW.probability,
        'source', NEW.source,
        'notes', NEW.notes,
        'ai_insight', NEW.ai_insight,
        'billing_type', NEW.billing_type,
        'mrr_amount', NEW.mrr_amount
      ),
      NEW.status
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger na tabela opportunities
DROP TRIGGER IF EXISTS trigger_index_opportunity_outcome ON opportunities;
CREATE TRIGGER trigger_index_opportunity_outcome
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION index_opportunity_outcome();