
CREATE TABLE store_visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  session_id text NOT NULL,
  contact_id uuid REFERENCES contacts(id),
  first_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text DEFAULT 'desktop',
  pages_viewed integer DEFAULT 1,
  products_viewed text[] DEFAULT '{}',
  time_on_site_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  ai_intent text,
  ai_score integer,
  ai_recommendation text,
  ai_classified_at timestamptz,
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, session_id)
);

ALTER TABLE store_visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON store_visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update own session" ON store_visitor_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Allow workspace members to read" ON store_visitor_sessions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_store_visitor_sessions_workspace 
  ON store_visitor_sessions(workspace_id, last_activity_at DESC);

CREATE INDEX idx_store_visitor_sessions_session 
  ON store_visitor_sessions(workspace_id, session_id);

CREATE INDEX idx_store_visitor_sessions_score 
  ON store_visitor_sessions(workspace_id, ai_score DESC NULLS LAST);
