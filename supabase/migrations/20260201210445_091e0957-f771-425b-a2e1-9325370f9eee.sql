-- Add autopilot fields directly to ai_agents table
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS response_delay_min INTEGER DEFAULT 8;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS response_delay_max INTEGER DEFAULT 12;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_messages_per_conversation INTEGER DEFAULT 25;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS max_consecutive_bot_messages INTEGER DEFAULT 3;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS respect_working_hours BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '09:00';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '18:00';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT '{1,2,3,4,5}';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Lisbon';
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS out_of_hours_message TEXT;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS typing_indicator BOOLEAN DEFAULT true;
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS sleep_on_human_reply BOOLEAN DEFAULT true;

-- Add index for active autopilot agents
CREATE INDEX IF NOT EXISTS idx_ai_agents_autopilot_active 
  ON ai_agents(workspace_id, channel) 
  WHERE is_active = true AND autopilot_enabled = true;

-- Add comment for documentation
COMMENT ON TABLE ai_agents IS 'Unified AI agents with per-channel autopilot configuration';