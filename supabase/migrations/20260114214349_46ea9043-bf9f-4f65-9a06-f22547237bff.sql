-- Add new automation triggers
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'lead_status_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'lead_no_response';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'opportunity_value_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'message_received';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'conversation_no_reply';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'proposal_created';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'proposal_viewed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'scheduled_time';

-- Add trigger_config column to store time-based settings (delay hours, specific date, etc.)
-- This column may already exist, so we use DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'automation_rules' AND column_name = 'trigger_config'
  ) THEN
    ALTER TABLE automation_rules ADD COLUMN trigger_config JSONB DEFAULT '{}';
  END IF;
END $$;