-- Add new automation action types
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'wait_time';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'stop_automation';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'change_lead_status';