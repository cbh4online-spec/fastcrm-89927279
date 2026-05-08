
-- =====================================================
-- LeadChef Phase 12A: Intelligence & AI Scoring
-- =====================================================

-- Lead scores: one row per lead with current score
CREATE TABLE IF NOT EXISTS public.leadchef_lead_scores (
  lead_id UUID NOT NULL PRIMARY KEY,
  workspace_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_cold BOOLEAN NOT NULL DEFAULT false,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadchef_lead_scores_workspace
  ON public.leadchef_lead_scores(workspace_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leadchef_lead_scores_cold
  ON public.leadchef_lead_scores(workspace_id, is_cold) WHERE is_cold = true;

ALTER TABLE public.leadchef_lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view lead scores"
  ON public.leadchef_lead_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_lead_scores.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE only via service role (Trigger.dev jobs / edge functions)

-- AI suggestions: cache + history
CREATE TABLE IF NOT EXISTS public.leadchef_ai_suggestions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  user_id UUID,
  kind TEXT NOT NULL DEFAULT 'next_action',
  context_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadchef_ai_suggestions_lead
  ON public.leadchef_ai_suggestions(workspace_id, lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadchef_ai_suggestions_cache
  ON public.leadchef_ai_suggestions(lead_id, context_hash, expires_at);

ALTER TABLE public.leadchef_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view AI suggestions"
  ON public.leadchef_ai_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_ai_suggestions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can mark suggestions as used"
  ON public.leadchef_ai_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_ai_suggestions.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_ai_suggestions.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- timestamps trigger
DROP TRIGGER IF EXISTS trg_leadchef_lead_scores_updated_at ON public.leadchef_lead_scores;
CREATE TRIGGER trg_leadchef_lead_scores_updated_at
  BEFORE UPDATE ON public.leadchef_lead_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
