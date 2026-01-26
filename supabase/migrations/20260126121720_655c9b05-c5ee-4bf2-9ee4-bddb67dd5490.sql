-- =============================================
-- CONTEXTUAL & ENTITY-BASED MEMORY SYSTEM
-- =============================================

-- Enhance ai_agent_memory with new fields for tiered memory
ALTER TABLE ai_agent_memory 
  ADD COLUMN IF NOT EXISTS memory_category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS source_execution_id UUID REFERENCES ai_agent_executions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'agent_conclusion',
  ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validated_by UUID,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES ai_agent_memory(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Index for semantic search on memory embeddings
CREATE INDEX IF NOT EXISTS ai_agent_memory_embedding_idx 
  ON ai_agent_memory USING hnsw (embedding vector_cosine_ops);

-- Index for efficient memory retrieval
CREATE INDEX IF NOT EXISTS idx_agent_memory_entity_retrieval 
  ON ai_agent_memory(workspace_id, entity_id, entity_type, expires_at);

-- Strategic Memory table for workspace-level patterns
CREATE TABLE IF NOT EXISTS ai_agent_strategic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('objection', 'conversion', 'churn', 'success', 'failure', 'preference', 'behavior')),
  pattern_description TEXT NOT NULL,
  
  -- Context
  entity_types TEXT[] NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '{}',
  
  -- Statistics
  occurrence_count INTEGER DEFAULT 1,
  confidence_score NUMERIC(3,2) DEFAULT 0.50 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  last_occurrence_at TIMESTAMPTZ DEFAULT now(),
  
  -- Derived insights
  recommended_actions TEXT[] DEFAULT '{}',
  contraindicated_actions TEXT[] DEFAULT '{}',
  
  -- Embedding for semantic search
  embedding vector(1536),
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on strategic memory
ALTER TABLE ai_agent_strategic_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategic memory
CREATE POLICY "Users can view strategic memories of their workspaces"
  ON ai_agent_strategic_memory FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create strategic memories in their workspaces"
  ON ai_agent_strategic_memory FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update strategic memories in their workspaces"
  ON ai_agent_strategic_memory FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete strategic memories in their workspaces"
  ON ai_agent_strategic_memory FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Indexes for strategic memory
CREATE INDEX IF NOT EXISTS idx_strategic_memory_workspace ON ai_agent_strategic_memory(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_strategic_memory_pattern ON ai_agent_strategic_memory(pattern_type, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_strategic_memory_embedding ON ai_agent_strategic_memory USING hnsw (embedding vector_cosine_ops);

-- Memory Access Log for tracking usage
CREATE TABLE IF NOT EXISTS ai_memory_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES ai_agent_memory(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES ai_agent_executions(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Access context
  access_type TEXT NOT NULL CHECK (access_type IN ('retrieved', 'used_in_reasoning', 'cited_in_output')),
  relevance_score_at_retrieval NUMERIC(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on access log
ALTER TABLE ai_memory_access_log ENABLE ROW LEVEL SECURITY;

-- RLS for access log (allow workspace members to view)
CREATE POLICY "Users can view memory access logs of their workspaces"
  ON ai_memory_access_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert memory access logs"
  ON ai_memory_access_log FOR INSERT
  WITH CHECK (true);

-- Indexes for access log
CREATE INDEX IF NOT EXISTS idx_memory_access_log_memory ON ai_memory_access_log(memory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_access_log_execution ON ai_memory_access_log(execution_id);

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Function: Retrieve Entity Memories with intelligent scoring
CREATE OR REPLACE FUNCTION retrieve_entity_memories(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_max_results INTEGER DEFAULT 10,
  p_min_relevance NUMERIC DEFAULT 0.3,
  p_include_strategic BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  memory_category TEXT,
  content TEXT,
  relevance_score NUMERIC,
  semantic_score NUMERIC,
  combined_score NUMERIC,
  is_validated BOOLEAN,
  version INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.memory_type,
    m.memory_category,
    m.content,
    COALESCE(m.relevance_score, 0.5)::NUMERIC as relevance_score,
    CASE 
      WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL 
      THEN (1 - (m.embedding <=> p_query_embedding))::NUMERIC
      ELSE 0.5::NUMERIC
    END as semantic_score,
    (
      COALESCE(m.relevance_score, 0.5) * 0.4 +
      CASE 
        WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL 
        THEN (1 - (m.embedding <=> p_query_embedding)) * 0.4
        ELSE 0.2
      END +
      GREATEST(0, (1.0 - EXTRACT(EPOCH FROM (now() - m.created_at)) / (90.0 * 24 * 60 * 60))) * 0.2
    )::NUMERIC as combined_score,
    m.is_validated,
    m.version,
    m.created_at
  FROM ai_agent_memory m
  WHERE 
    m.workspace_id = p_workspace_id
    AND m.entity_id = p_entity_id
    AND m.entity_type = p_entity_type
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND m.superseded_by IS NULL
    AND COALESCE(m.relevance_score, 0.5) >= p_min_relevance
  ORDER BY combined_score DESC
  LIMIT p_max_results;
END;
$$;

-- Function: Store Entity Memory with duplicate detection and limits
CREATE OR REPLACE FUNCTION store_entity_memory(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT,
  p_memory_type TEXT,
  p_content TEXT,
  p_relevance_score NUMERIC DEFAULT 1.0,
  p_memory_category TEXT DEFAULT 'general',
  p_source_execution_id UUID DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 90,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory_id UUID;
  v_existing_id UUID;
  v_memory_count INTEGER;
  v_max_memories INTEGER := 50;
  v_truncated_content TEXT;
BEGIN
  -- Truncate content to max 2000 chars
  v_truncated_content := LEFT(p_content, 2000);
  
  -- Check if similar memory exists (potential duplicate)
  SELECT id INTO v_existing_id
  FROM ai_agent_memory
  WHERE 
    workspace_id = p_workspace_id
    AND entity_id = p_entity_id
    AND memory_type = p_memory_type
    AND content = v_truncated_content
    AND (expires_at IS NULL OR expires_at > now())
    AND superseded_by IS NULL
  LIMIT 1;
  
  -- If duplicate exists, update relevance and access count
  IF v_existing_id IS NOT NULL THEN
    UPDATE ai_agent_memory
    SET 
      relevance_score = GREATEST(COALESCE(relevance_score, 0.5), LEAST(p_relevance_score, 1.0)),
      access_count = COALESCE(access_count, 0) + 1,
      last_accessed_at = now()
    WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;
  
  -- Check memory limit per entity
  SELECT COUNT(*) INTO v_memory_count
  FROM ai_agent_memory
  WHERE 
    workspace_id = p_workspace_id
    AND entity_id = p_entity_id
    AND (expires_at IS NULL OR expires_at > now())
    AND superseded_by IS NULL;
  
  -- If limit reached, remove lowest relevance non-validated memories
  IF v_memory_count >= v_max_memories THEN
    DELETE FROM ai_agent_memory
    WHERE id IN (
      SELECT id 
      FROM ai_agent_memory
      WHERE 
        workspace_id = p_workspace_id
        AND entity_id = p_entity_id
        AND is_validated = false
        AND superseded_by IS NULL
      ORDER BY COALESCE(relevance_score, 0.5) ASC, created_at ASC
      LIMIT 5
    );
  END IF;
  
  -- Insert new memory
  INSERT INTO ai_agent_memory (
    workspace_id,
    entity_id,
    entity_type,
    memory_type,
    memory_category,
    content,
    relevance_score,
    source_execution_id,
    source_type,
    expires_at,
    created_by,
    version,
    access_count
  ) VALUES (
    p_workspace_id,
    p_entity_id,
    p_entity_type,
    p_memory_type,
    p_memory_category,
    v_truncated_content,
    LEAST(p_relevance_score, 1.0),
    p_source_execution_id,
    'agent_conclusion',
    CASE WHEN p_expires_in_days > 0 THEN now() + (p_expires_in_days || ' days')::interval ELSE NULL END,
    p_created_by,
    1,
    0
  )
  RETURNING id INTO v_memory_id;
  
  RETURN v_memory_id;
END;
$$;

-- Function: Consolidate Entity Memories (cleanup old/irrelevant)
CREATE OR REPLACE FUNCTION consolidate_entity_memories(
  p_workspace_id UUID,
  p_entity_id UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consolidated INTEGER := 0;
BEGIN
  -- Mark old, low-relevance, unaccessed memories as expired
  UPDATE ai_agent_memory
  SET expires_at = now()
  WHERE 
    workspace_id = p_workspace_id
    AND (p_entity_id IS NULL OR entity_id = p_entity_id)
    AND (p_entity_type IS NULL OR entity_type = p_entity_type)
    AND (
      -- Low relevance and old
      (COALESCE(relevance_score, 0.5) < 0.3 AND created_at < now() - interval '30 days')
      -- Never accessed and old
      OR (COALESCE(access_count, 0) = 0 AND created_at < now() - interval '60 days')
      -- Very old regardless (unless validated)
      OR (created_at < now() - interval '180 days' AND is_validated = false)
    )
    AND is_validated = false
    AND (expires_at IS NULL OR expires_at > now())
    AND superseded_by IS NULL;
  
  GET DIAGNOSTICS v_consolidated = ROW_COUNT;
  
  RETURN v_consolidated;
END;
$$;

-- Function: Log memory access
CREATE OR REPLACE FUNCTION log_memory_access(
  p_memory_id UUID,
  p_execution_id UUID,
  p_access_type TEXT,
  p_relevance_score NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Get workspace from memory
  SELECT workspace_id INTO v_workspace_id
  FROM ai_agent_memory
  WHERE id = p_memory_id;
  
  IF v_workspace_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insert access log
  INSERT INTO ai_memory_access_log (
    memory_id,
    execution_id,
    workspace_id,
    access_type,
    relevance_score_at_retrieval
  ) VALUES (
    p_memory_id,
    p_execution_id,
    v_workspace_id,
    p_access_type,
    p_relevance_score
  )
  RETURNING id INTO v_log_id;
  
  -- Update memory access count
  UPDATE ai_agent_memory
  SET 
    access_count = COALESCE(access_count, 0) + 1,
    last_accessed_at = now()
  WHERE id = p_memory_id;
  
  RETURN v_log_id;
END;
$$;

-- Function: Validate/invalidate memory
CREATE OR REPLACE FUNCTION validate_memory(
  p_memory_id UUID,
  p_is_valid BOOLEAN,
  p_validated_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_agent_memory
  SET 
    is_validated = p_is_valid,
    validated_by = COALESCE(p_validated_by, auth.uid()),
    validated_at = CASE WHEN p_is_valid THEN now() ELSE NULL END,
    -- Boost relevance for validated memories
    relevance_score = CASE 
      WHEN p_is_valid THEN GREATEST(COALESCE(relevance_score, 0.5), 0.9)
      ELSE LEAST(COALESCE(relevance_score, 0.5), 0.3)
    END
  WHERE id = p_memory_id;
  
  RETURN FOUND;
END;
$$;

-- Function: Supersede memory (versioning)
CREATE OR REPLACE FUNCTION supersede_memory(
  p_old_memory_id UUID,
  p_new_content TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_memory RECORD;
  v_new_memory_id UUID;
BEGIN
  -- Get old memory details
  SELECT * INTO v_old_memory
  FROM ai_agent_memory
  WHERE id = p_old_memory_id;
  
  IF v_old_memory IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create new version
  INSERT INTO ai_agent_memory (
    workspace_id,
    entity_id,
    entity_type,
    memory_type,
    memory_category,
    content,
    relevance_score,
    source_type,
    version,
    created_by
  ) VALUES (
    v_old_memory.workspace_id,
    v_old_memory.entity_id,
    v_old_memory.entity_type,
    v_old_memory.memory_type,
    v_old_memory.memory_category,
    LEFT(p_new_content, 2000),
    v_old_memory.relevance_score,
    'user_input',
    COALESCE(v_old_memory.version, 1) + 1,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_new_memory_id;
  
  -- Mark old memory as superseded
  UPDATE ai_agent_memory
  SET superseded_by = v_new_memory_id
  WHERE id = p_old_memory_id;
  
  RETURN v_new_memory_id;
END;
$$;

-- Function: Get memory stats for entity
CREATE OR REPLACE FUNCTION get_entity_memory_stats(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_memories', COUNT(*),
    'active_memories', COUNT(*) FILTER (WHERE (expires_at IS NULL OR expires_at > now()) AND superseded_by IS NULL),
    'validated_memories', COUNT(*) FILTER (WHERE is_validated = true AND superseded_by IS NULL),
    'average_relevance', ROUND(AVG(COALESCE(relevance_score, 0.5))::NUMERIC, 2),
    'memory_types', jsonb_object_agg(
      COALESCE(memory_type, 'unknown'),
      type_count
    ),
    'oldest_memory', MIN(created_at),
    'newest_memory', MAX(created_at)
  ) INTO v_result
  FROM (
    SELECT 
      memory_type,
      expires_at,
      superseded_by,
      is_validated,
      relevance_score,
      created_at,
      COUNT(*) OVER (PARTITION BY memory_type) as type_count
    FROM ai_agent_memory
    WHERE 
      workspace_id = p_workspace_id
      AND entity_id = p_entity_id
      AND entity_type = p_entity_type
  ) sub;
  
  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;