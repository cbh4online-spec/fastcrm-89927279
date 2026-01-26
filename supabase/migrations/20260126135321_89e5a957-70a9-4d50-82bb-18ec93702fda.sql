-- Create enum for event types
CREATE TYPE public.analytics_event_type AS ENUM (
  'recommendation_generated',
  'recommendation_viewed',
  'recommendation_accepted',
  'recommendation_dismissed',
  'recommendation_rated',
  'action_executed',
  'entity_outcome_updated',
  'agent_run_failed',
  'rag_retrieval_quality'
);

-- Create enum for priority levels
CREATE TYPE public.analytics_priority AS ENUM ('low', 'medium', 'high');

-- Create enum for confidence levels  
CREATE TYPE public.analytics_confidence AS ENUM ('low', 'medium', 'high');

-- Create the main analytics events table
CREATE TABLE public.ai_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Event identification
  event_type public.analytics_event_type NOT NULL,
  recommendation_id UUID, -- Links recommendations to outcomes
  
  -- Entity context
  entity_type TEXT, -- 'lead', 'opportunity', 'contact', 'company'
  entity_id UUID,
  
  -- Agent context
  agent_type TEXT, -- 'lead', 'opportunity', 'client', 'orchestrator'
  recommendation_type TEXT, -- 'call', 'email', 'whatsapp', 'proposal', 'task', 'nurture', 'archive'
  
  -- Quality metrics
  priority public.analytics_priority,
  confidence public.analytics_confidence,
  
  -- Technical metadata
  model_version TEXT,
  prompt_version TEXT,
  used_rag BOOLEAN DEFAULT false,
  used_cache BOOLEAN DEFAULT false,
  latency_ms INTEGER,
  
  -- Interaction context
  surface TEXT, -- 'dashboard', 'entity_page', 'notification'
  
  -- Feedback data
  dismiss_reason TEXT,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  
  -- Timing metrics
  time_to_action_seconds INTEGER,
  
  -- Action execution
  action_type TEXT,
  execution_channel TEXT, -- 'crm', 'whatsapp', 'email'
  automation_id UUID,
  
  -- Outcome tracking
  outcome_type TEXT, -- 'reply_received', 'stage_progressed', 'won', 'lost', 'stalled'
  new_stage TEXT,
  time_since_action_hours NUMERIC,
  
  -- RAG quality (for rag_retrieval_quality events)
  retrieval_candidates INTEGER,
  chunks_used INTEGER,
  avg_relevance_score NUMERIC,
  rerank_used BOOLEAN,
  
  -- Error tracking (for agent_run_failed events)
  error_type TEXT,
  error_reason TEXT,
  timeout BOOLEAN,
  
  -- Flexible additional properties
  properties JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Indexes for common queries
  CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- Create indexes for performance
CREATE INDEX idx_ai_analytics_workspace ON public.ai_analytics_events(workspace_id);
CREATE INDEX idx_ai_analytics_event_type ON public.ai_analytics_events(event_type);
CREATE INDEX idx_ai_analytics_entity ON public.ai_analytics_events(entity_type, entity_id);
CREATE INDEX idx_ai_analytics_recommendation ON public.ai_analytics_events(recommendation_id);
CREATE INDEX idx_ai_analytics_created ON public.ai_analytics_events(created_at DESC);
CREATE INDEX idx_ai_analytics_agent ON public.ai_analytics_events(agent_type);
CREATE INDEX idx_ai_analytics_user ON public.ai_analytics_events(user_id);

-- Composite index for funnel analysis
CREATE INDEX idx_ai_analytics_funnel ON public.ai_analytics_events(
  workspace_id, 
  recommendation_id, 
  event_type, 
  created_at
);

-- Enable RLS
ALTER TABLE public.ai_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace members can view their workspace's analytics
CREATE POLICY "Workspace members can view analytics"
ON public.ai_analytics_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_analytics_events.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- RLS Policy: authenticated users can insert their own events
CREATE POLICY "Users can insert their own events"
ON public.ai_analytics_events
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_analytics_events.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Create daily aggregates table for performance
CREATE TABLE public.ai_analytics_daily_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  agent_type TEXT NOT NULL,
  
  -- Funnel metrics
  recommendations_generated INTEGER DEFAULT 0,
  recommendations_viewed INTEGER DEFAULT 0,
  recommendations_accepted INTEGER DEFAULT 0,
  recommendations_dismissed INTEGER DEFAULT 0,
  actions_executed INTEGER DEFAULT 0,
  outcomes_positive INTEGER DEFAULT 0, -- reply, stage_progressed, won
  outcomes_negative INTEGER DEFAULT 0, -- lost, stalled
  
  -- Quality metrics
  avg_latency_ms NUMERIC,
  cache_hit_rate NUMERIC,
  rag_usage_rate NUMERIC,
  avg_confidence_score NUMERIC,
  
  -- Time metrics
  avg_time_to_action_seconds NUMERIC,
  
  -- Error metrics
  failures_count INTEGER DEFAULT 0,
  timeout_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, date, agent_type)
);

-- Enable RLS on aggregates
ALTER TABLE public.ai_analytics_daily_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS for aggregates
CREATE POLICY "Workspace members can view daily aggregates"
ON public.ai_analytics_daily_aggregates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_analytics_daily_aggregates.workspace_id
    AND wm.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Function to calculate funnel metrics
CREATE OR REPLACE FUNCTION public.get_agent_funnel_metrics(
  p_workspace_id UUID,
  p_agent_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  agent_type TEXT,
  generated BIGINT,
  viewed BIGINT,
  accepted BIGINT,
  dismissed BIGINT,
  executed BIGINT,
  outcomes_positive BIGINT,
  view_rate NUMERIC,
  acceptance_rate NUMERIC,
  execution_rate NUMERIC,
  outcome_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH events AS (
    SELECT 
      COALESCE(e.agent_type, 'unknown') as agent_type,
      e.event_type,
      e.recommendation_id
    FROM public.ai_analytics_events e
    WHERE e.workspace_id = p_workspace_id
      AND e.created_at BETWEEN p_start_date AND p_end_date
      AND (p_agent_type IS NULL OR e.agent_type = p_agent_type)
  ),
  metrics AS (
    SELECT
      agent_type,
      COUNT(*) FILTER (WHERE event_type = 'recommendation_generated') as generated,
      COUNT(*) FILTER (WHERE event_type = 'recommendation_viewed') as viewed,
      COUNT(*) FILTER (WHERE event_type = 'recommendation_accepted') as accepted,
      COUNT(*) FILTER (WHERE event_type = 'recommendation_dismissed') as dismissed,
      COUNT(*) FILTER (WHERE event_type = 'action_executed') as executed,
      COUNT(*) FILTER (WHERE event_type = 'entity_outcome_updated' AND recommendation_id IS NOT NULL) as outcomes_positive
    FROM events
    GROUP BY agent_type
  )
  SELECT
    m.agent_type,
    m.generated,
    m.viewed,
    m.accepted,
    m.dismissed,
    m.executed,
    m.outcomes_positive,
    CASE WHEN m.generated > 0 THEN ROUND((m.viewed::NUMERIC / m.generated) * 100, 2) ELSE 0 END as view_rate,
    CASE WHEN m.viewed > 0 THEN ROUND((m.accepted::NUMERIC / m.viewed) * 100, 2) ELSE 0 END as acceptance_rate,
    CASE WHEN m.accepted > 0 THEN ROUND((m.executed::NUMERIC / m.accepted) * 100, 2) ELSE 0 END as execution_rate,
    CASE WHEN m.executed > 0 THEN ROUND((m.outcomes_positive::NUMERIC / m.executed) * 100, 2) ELSE 0 END as outcome_rate
  FROM metrics m
  ORDER BY m.generated DESC;
$$;