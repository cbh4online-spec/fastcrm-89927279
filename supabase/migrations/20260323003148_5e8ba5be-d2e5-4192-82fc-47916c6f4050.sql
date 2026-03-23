
-- Tabelas da Recommendation Skill

CREATE TABLE IF NOT EXISTS product_recommendations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id)  ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id)     ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score                    NUMERIC(5,2) NOT NULL DEFAULT 0,
  strategy                 TEXT NOT NULL,
  confidence               TEXT DEFAULT 'medium',
  reason                   TEXT,
  reason_tags              TEXT[] DEFAULT '{}',
  status                   TEXT DEFAULT 'pending',
  dismissed_reason         TEXT,
  shown_at                 TIMESTAMPTZ,
  acted_on_at              TIMESTAMPTZ,
  converted_value          NUMERIC(12,2),
  generated_at             TIMESTAMPTZ DEFAULT now(),
  generated_by             TEXT DEFAULT 'auto',
  trigger_module           TEXT,
  expires_at               TIMESTAMPTZ DEFAULT now() + interval '30 days',
  calc_history_score       NUMERIC(5,2) DEFAULT 0,
  calc_profile_score       NUMERIC(5,2) DEFAULT 0,
  calc_collaborative_score NUMERIC(5,2) DEFAULT 0,
  calc_semantic_score      NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT entity_check CHECK (
    (contact_id IS NOT NULL)::int +
    (company_id IS NOT NULL)::int +
    (lead_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_rec_contact ON product_recommendations(workspace_id, contact_id, score DESC)
  WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rec_company ON product_recommendations(workspace_id, company_id, score DESC)
  WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rec_lead ON product_recommendations(workspace_id, lead_id, score DESC)
  WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rec_status ON product_recommendations(workspace_id, status);

ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON product_recommendations
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Feedback
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES product_recommendations(id) ON DELETE CASCADE,
  feedback          TEXT NOT NULL,
  context_module    TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON recommendation_feedback
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Config
CREATE TABLE IF NOT EXISTS recommendation_config (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id               UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  weight_history             NUMERIC(3,2) DEFAULT 0.40,
  weight_profile             NUMERIC(3,2) DEFAULT 0.25,
  weight_collaborative       NUMERIC(3,2) DEFAULT 0.20,
  weight_semantic            NUMERIC(3,2) DEFAULT 0.15,
  min_score_threshold        NUMERIC(5,2) DEFAULT 20,
  max_recommendations        INTEGER DEFAULT 10,
  enabled                    BOOLEAN DEFAULT true,
  created_at                 TIMESTAMPTZ DEFAULT now(),
  updated_at                 TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recommendation_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON recommendation_config
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Refresh function (views já existem)
CREATE OR REPLACE FUNCTION refresh_recommendation_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY entity_purchase_history;
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_cooccurrence;
END;
$$;
