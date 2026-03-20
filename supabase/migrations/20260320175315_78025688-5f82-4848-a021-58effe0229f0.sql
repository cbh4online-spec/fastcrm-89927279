
-- Suppression list
CREATE TABLE IF NOT EXISTS campaign_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('hard_bounce','soft_bounce','spam_complaint','unsubscribe','manual')),
  campaign_id uuid REFERENCES marketing_campaigns(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, email)
);

ALTER TABLE campaign_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppressions in their workspace" ON campaign_suppressions
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert suppressions in their workspace" ON campaign_suppressions
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete suppressions in their workspace" ON campaign_suppressions
  FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Send queue for throttling
CREATE TABLE IF NOT EXISTS campaign_send_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  contact_id uuid,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','suppressed')),
  batch_number int DEFAULT 1,
  scheduled_for timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view send queue in their workspace" ON campaign_send_queue
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert into send queue in their workspace" ON campaign_send_queue
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update send queue in their workspace" ON campaign_send_queue
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Click tracking per link
CREATE TABLE IF NOT EXISTS campaign_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  recipient_email text,
  contact_id uuid,
  link_url text NOT NULL,
  link_label text,
  link_position int,
  clicked_at timestamptz DEFAULT now(),
  user_agent text,
  ip_hash text
);

ALTER TABLE campaign_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view click data in their workspace" ON campaign_link_clicks
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Behavioural triggers
CREATE TABLE IF NOT EXISTS campaign_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
  trigger_event text NOT NULL CHECK (trigger_event IN ('opened','clicked','not_opened','not_clicked','bounced')),
  wait_hours int DEFAULT 48,
  action_type text NOT NULL CHECK (action_type IN ('enroll_sequence','send_campaign','add_tag','webhook')),
  action_payload jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage triggers in their workspace" ON campaign_triggers
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Trigger execution log
CREATE TABLE IF NOT EXISTS campaign_trigger_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id uuid REFERENCES campaign_triggers(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  contact_id uuid,
  executed_at timestamptz DEFAULT now(),
  action_result jsonb,
  UNIQUE(trigger_id, recipient_email)
);

ALTER TABLE campaign_trigger_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trigger executions in their workspace" ON campaign_trigger_executions
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- A/B tests
CREATE TABLE IF NOT EXISTS campaign_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  variant_a_subject text NOT NULL,
  variant_b_subject text NOT NULL,
  test_percentage int DEFAULT 20,
  wait_hours int DEFAULT 4,
  winner_metric text DEFAULT 'open_rate' CHECK (winner_metric IN ('open_rate','click_rate')),
  winner_variant text CHECK (winner_variant IN ('a','b')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','testing','completed')),
  variant_a_opens int DEFAULT 0,
  variant_b_opens int DEFAULT 0,
  variant_a_clicks int DEFAULT 0,
  variant_b_clicks int DEFAULT 0,
  variant_a_sent int DEFAULT 0,
  variant_b_sent int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage AB tests in their workspace" ON campaign_ab_tests
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Optimal send times per contact
CREATE TABLE IF NOT EXISTS contact_send_time_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  preferred_hour int,
  preferred_day_of_week int,
  open_rate_score numeric,
  last_computed_at timestamptz,
  UNIQUE(workspace_id, contact_id)
);

ALTER TABLE contact_send_time_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view send time profiles in their workspace" ON contact_send_time_profile
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Add new columns to marketing_campaigns
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS send_mode text DEFAULT 'immediate',
  ADD COLUMN IF NOT EXISTS batch_size int DEFAULT 100,
  ADD COLUMN IF NOT EXISTS batch_interval_minutes int DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ab_test_id uuid,
  ADD COLUMN IF NOT EXISTS suppression_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invalid_count int DEFAULT 0;

-- Dynamic segments saved rules
CREATE TABLE IF NOT EXISTS campaign_saved_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  rules jsonb NOT NULL,
  contact_count int DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_saved_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage saved segments in their workspace" ON campaign_saved_segments
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
