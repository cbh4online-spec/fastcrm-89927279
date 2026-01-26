-- =============================================================================
-- AI AGENT RESPONSE CACHE & METRICS TABLES
-- =============================================================================

-- Main cache table for storing LLM responses
CREATE TABLE ai_agent_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  entity_state_hash TEXT NOT NULL,
  memory_version TIMESTAMP WITH TIME ZONE,
  prompt_version TEXT NOT NULL DEFAULT 'v1.0',
  context_hash TEXT,
  
  -- Cached response
  response JSONB NOT NULL,
  executive_summary TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  hit_count INTEGER DEFAULT 0,
  original_duration_ms INTEGER,
  tokens_saved INTEGER DEFAULT 0,
  
  -- Invalidation
  invalidated_at TIMESTAMP WITH TIME ZONE,
  invalidation_reason TEXT,
  
  CONSTRAINT unique_cache_key UNIQUE (cache_key)
);

-- Indexes for efficient lookups (without time-based predicate)
CREATE INDEX idx_cache_lookup ON ai_agent_response_cache(cache_key) 
  WHERE invalidated_at IS NULL;
CREATE INDEX idx_cache_entity ON ai_agent_response_cache(entity_id, agent_type);
CREATE INDEX idx_cache_workspace ON ai_agent_response_cache(workspace_id);
CREATE INDEX idx_cache_expiry ON ai_agent_response_cache(expires_at) 
  WHERE invalidated_at IS NULL;
CREATE INDEX idx_cache_valid ON ai_agent_response_cache(cache_key, expires_at, invalidated_at);

-- Metrics table for tracking cache performance
CREATE TABLE ai_cache_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  invalidations INTEGER DEFAULT 0,
  tokens_saved INTEGER DEFAULT 0,
  avg_hit_latency_ms INTEGER,
  avg_miss_latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint for upsert operations
  CONSTRAINT unique_metrics_period UNIQUE (workspace_id, agent_type, period_start)
);

CREATE INDEX idx_metrics_lookup ON ai_cache_metrics(workspace_id, agent_type, period_start);

-- Enable Row Level Security
ALTER TABLE ai_agent_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cache table
CREATE POLICY "Cache access by workspace members" ON ai_agent_response_cache
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- RLS Policies for metrics table
CREATE POLICY "Metrics read by workspace members" ON ai_cache_metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Metrics insert by workspace members" ON ai_cache_metrics
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Metrics update by workspace members" ON ai_cache_metrics
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

-- =============================================================================
-- INVALIDATION FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to invalidate entity cache when entity is updated
CREATE OR REPLACE FUNCTION invalidate_entity_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agent_response_cache
  SET 
    invalidated_at = now(),
    invalidation_reason = TG_TABLE_NAME || ' updated'
  WHERE 
    entity_id = NEW.id 
    AND invalidated_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to invalidate cache when memory is updated
CREATE OR REPLACE FUNCTION invalidate_memory_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agent_response_cache
  SET 
    invalidated_at = now(),
    invalidation_reason = 'memory updated'
  WHERE 
    entity_id = NEW.entity_id 
    AND invalidated_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for entity invalidation
CREATE TRIGGER invalidate_lead_cache
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

CREATE TRIGGER invalidate_opportunity_cache
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

CREATE TRIGGER invalidate_contact_cache
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

CREATE TRIGGER invalidate_company_cache
  AFTER UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

-- Trigger for memory invalidation
CREATE TRIGGER invalidate_cache_on_memory
  AFTER INSERT OR UPDATE ON ai_agent_memory
  FOR EACH ROW EXECUTE FUNCTION invalidate_memory_cache();

-- =============================================================================
-- CACHE CLEANUP FUNCTION (for scheduled cleanup)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_agent_response_cache
  WHERE expires_at < now() OR invalidated_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- CACHE METRICS UPSERT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_cache_metrics(
  p_workspace_id UUID,
  p_agent_type TEXT,
  p_cache_hit BOOLEAN,
  p_tokens_saved INTEGER DEFAULT 0,
  p_latency_ms INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  v_period_start := date_trunc('hour', now());
  v_period_end := v_period_start + interval '1 hour';
  
  INSERT INTO ai_cache_metrics (
    workspace_id, 
    agent_type, 
    period_start, 
    period_end, 
    cache_hits,
    cache_misses,
    tokens_saved,
    avg_hit_latency_ms,
    avg_miss_latency_ms
  )
  VALUES (
    p_workspace_id,
    p_agent_type,
    v_period_start,
    v_period_end,
    CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    CASE WHEN NOT p_cache_hit THEN 1 ELSE 0 END,
    p_tokens_saved,
    CASE WHEN p_cache_hit THEN p_latency_ms ELSE NULL END,
    CASE WHEN NOT p_cache_hit THEN p_latency_ms ELSE NULL END
  )
  ON CONFLICT (workspace_id, agent_type, period_start)
  DO UPDATE SET
    cache_hits = ai_cache_metrics.cache_hits + CASE WHEN p_cache_hit THEN 1 ELSE 0 END,
    cache_misses = ai_cache_metrics.cache_misses + CASE WHEN NOT p_cache_hit THEN 1 ELSE 0 END,
    tokens_saved = ai_cache_metrics.tokens_saved + p_tokens_saved,
    avg_hit_latency_ms = CASE 
      WHEN p_cache_hit THEN 
        COALESCE((ai_cache_metrics.avg_hit_latency_ms * ai_cache_metrics.cache_hits + p_latency_ms) / (ai_cache_metrics.cache_hits + 1), p_latency_ms)
      ELSE ai_cache_metrics.avg_hit_latency_ms
    END,
    avg_miss_latency_ms = CASE 
      WHEN NOT p_cache_hit THEN 
        COALESCE((ai_cache_metrics.avg_miss_latency_ms * ai_cache_metrics.cache_misses + p_latency_ms) / (ai_cache_metrics.cache_misses + 1), p_latency_ms)
      ELSE ai_cache_metrics.avg_miss_latency_ms
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;