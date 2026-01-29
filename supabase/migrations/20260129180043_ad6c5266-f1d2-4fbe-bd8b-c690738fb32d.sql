-- =============================================
-- SECTION 12: FUTURE ENHANCEMENTS
-- Infrastructure for advanced conversational analytics
-- =============================================

-- 1. AUTOMATIC CONVERSATION SCORING
-- Tracks quality metrics for each conversation
CREATE TABLE public.conversation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  
  -- Overall scores (0-100)
  overall_score INTEGER,
  
  -- Dimension scores
  engagement_score INTEGER, -- User responsiveness, message length, questions asked
  qualification_score INTEGER, -- Data collected, objectives met
  sentiment_score INTEGER, -- Positive/negative trend
  conversion_score INTEGER, -- Progress toward goal
  efficiency_score INTEGER, -- Messages to achieve objective
  
  -- Calculated metrics
  avg_response_time_seconds INTEGER,
  user_message_count INTEGER,
  bot_message_count INTEGER,
  objectives_completed INTEGER,
  objectives_total INTEGER,
  
  -- Flags
  had_escalation BOOLEAN DEFAULT false,
  had_negative_sentiment BOOLEAN DEFAULT false,
  reached_goal BOOLEAN DEFAULT false,
  
  -- Scoring metadata
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scoring_model TEXT DEFAULT 'v1',
  scoring_method TEXT DEFAULT 'automated', -- automated, manual, hybrid
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversation scores in their workspace"
  ON public.conversation_scores FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 2. AI RESPONSE AUDITING
-- Logs every AI response for quality review
CREATE TABLE public.ai_response_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message_id UUID,
  
  -- Response details
  persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  vibe_profile_id UUID REFERENCES public.vibe_profiles(id) ON DELETE SET NULL,
  
  -- Input context
  user_message TEXT NOT NULL,
  context_used JSONB, -- KB chunks, memory, etc.
  
  -- Generated response
  ai_response TEXT NOT NULL,
  response_tokens INTEGER,
  latency_ms INTEGER,
  
  -- Quality flags (automated)
  followed_vibe BOOLEAN,
  followed_rules BOOLEAN,
  within_knowledge BOOLEAN,
  appropriate_length BOOLEAN,
  
  -- Human review (optional)
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
  review_notes TEXT,
  review_issues TEXT[], -- e.g., ['off_topic', 'too_long', 'wrong_tone']
  
  -- Corrections
  corrected_response TEXT,
  correction_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_response_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audits in their workspace"
  ON public.ai_response_audits FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage audits in their workspace"
  ON public.ai_response_audits FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- 3. PERSONA BENCHMARKING
-- Compares performance across personas
CREATE TABLE public.persona_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Volume metrics
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_overall_score NUMERIC(5,2),
  avg_engagement_score NUMERIC(5,2),
  avg_qualification_score NUMERIC(5,2),
  avg_sentiment_score NUMERIC(5,2),
  avg_conversion_score NUMERIC(5,2),
  
  -- Efficiency metrics
  avg_messages_to_goal NUMERIC(5,2),
  avg_time_to_goal_minutes NUMERIC(8,2),
  goal_completion_rate NUMERIC(5,2),
  
  -- Issue metrics
  escalation_rate NUMERIC(5,2),
  negative_sentiment_rate NUMERIC(5,2),
  rule_violation_rate NUMERIC(5,2),
  
  -- Comparison
  rank_in_workspace INTEGER,
  percentile NUMERIC(5,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, persona_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.persona_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view benchmarks in their workspace"
  ON public.persona_benchmarks FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 4. CONVERSATIONAL REPLAY
-- Stores structured replay data for conversation playback
CREATE TABLE public.conversation_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE,
  
  -- Replay metadata
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Participants
  lead_id UUID,
  persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  human_agents UUID[], -- If escalated
  
  -- Journey snapshot
  initial_stage TEXT,
  final_stage TEXT,
  stages_visited TEXT[],
  
  -- Structured replay events (ordered)
  replay_events JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Format: [{ timestamp, type, actor, content, metadata }]
  
  -- Highlights/annotations
  highlights JSONB DEFAULT '[]'::JSONB,
  -- Format: [{ timestamp, type, note, created_by }]
  
  -- Outcome
  outcome TEXT, -- completed, abandoned, escalated, timeout
  final_score INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_replays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view replays in their workspace"
  ON public.conversation_replays FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 5. COPY IMPROVEMENT RECOMMENDATIONS
-- AI-generated suggestions to improve response quality
CREATE TABLE public.copy_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Source
  source_type TEXT NOT NULL, -- persona, vibe, rule, kb_entry, fallback
  source_id UUID,
  
  -- Original content
  original_copy TEXT NOT NULL,
  context TEXT, -- When this copy is used
  
  -- Recommendation
  recommended_copy TEXT NOT NULL,
  improvement_type TEXT NOT NULL, -- clarity, tone, length, engagement, compliance
  explanation TEXT NOT NULL,
  confidence NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Evidence
  based_on_conversations INTEGER, -- Number of conversations analyzed
  avg_score_with_original NUMERIC(5,2),
  projected_score_improvement NUMERIC(5,2),
  example_conversation_ids UUID[],
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, testing
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- A/B Testing
  is_in_test BOOLEAN DEFAULT false,
  test_started_at TIMESTAMPTZ,
  test_variant TEXT, -- A (original) or B (recommended)
  test_results JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copy_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view copy recommendations in their workspace"
  ON public.copy_recommendations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage copy recommendations in their workspace"
  ON public.copy_recommendations FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- HELPER FUNCTIONS

-- Calculate conversation score
CREATE OR REPLACE FUNCTION public.calculate_conversation_score(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER;
  v_engagement INTEGER;
  v_qualification INTEGER;
  v_efficiency INTEGER;
BEGIN
  -- Placeholder logic - will be enhanced with actual scoring algorithm
  -- For now, return a weighted average of sub-scores if they exist
  SELECT 
    COALESCE(
      (engagement_score * 0.25 + qualification_score * 0.30 + 
       sentiment_score * 0.20 + conversion_score * 0.25),
      50
    )::INTEGER
  INTO v_score
  FROM conversation_scores
  WHERE conversation_id = p_conversation_id
  ORDER BY scored_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_score, 50);
END;
$$;

-- Generate replay events from messages
CREATE OR REPLACE FUNCTION public.build_conversation_replay(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events JSONB := '[]'::JSONB;
  v_message RECORD;
BEGIN
  FOR v_message IN 
    SELECT 
      m.id,
      m.content,
      m.direction,
      m.sent_at,
      m.attachments
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    ORDER BY m.sent_at ASC
  LOOP
    v_events := v_events || jsonb_build_object(
      'timestamp', v_message.sent_at,
      'type', 'message',
      'actor', CASE WHEN v_message.direction = 'inbound' THEN 'user' ELSE 'bot' END,
      'content', v_message.content,
      'metadata', jsonb_build_object(
        'message_id', v_message.id,
        'attachments', v_message.attachments
      )
    );
  END LOOP;
  
  RETURN v_events;
END;
$$;

-- INDEXES
CREATE INDEX idx_conversation_scores_conversation ON public.conversation_scores(conversation_id);
CREATE INDEX idx_conversation_scores_workspace_date ON public.conversation_scores(workspace_id, scored_at DESC);
CREATE INDEX idx_conversation_scores_overall ON public.conversation_scores(workspace_id, overall_score DESC);

CREATE INDEX idx_ai_response_audits_conversation ON public.ai_response_audits(conversation_id);
CREATE INDEX idx_ai_response_audits_persona ON public.ai_response_audits(persona_id);
CREATE INDEX idx_ai_response_audits_pending_review ON public.ai_response_audits(workspace_id) 
  WHERE reviewed_at IS NULL;

CREATE INDEX idx_persona_benchmarks_persona ON public.persona_benchmarks(persona_id);
CREATE INDEX idx_persona_benchmarks_period ON public.persona_benchmarks(workspace_id, period_start, period_end);

CREATE INDEX idx_conversation_replays_conversation ON public.conversation_replays(conversation_id);
CREATE INDEX idx_conversation_replays_lead ON public.conversation_replays(lead_id);

CREATE INDEX idx_copy_recommendations_status ON public.copy_recommendations(workspace_id, status);
CREATE INDEX idx_copy_recommendations_source ON public.copy_recommendations(source_type, source_id);

-- Trigger for updated_at
CREATE TRIGGER update_copy_recommendations_updated_at
  BEFORE UPDATE ON public.copy_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.conversation_scores IS 'Automatic quality scoring for conversations - Section 12';
COMMENT ON TABLE public.ai_response_audits IS 'Audit trail for AI responses with human review capability - Section 12';
COMMENT ON TABLE public.persona_benchmarks IS 'Performance comparison across AI personas - Section 12';
COMMENT ON TABLE public.conversation_replays IS 'Structured replay data for conversation playback - Section 12';
COMMENT ON TABLE public.copy_recommendations IS 'AI-generated copy improvement suggestions - Section 12';