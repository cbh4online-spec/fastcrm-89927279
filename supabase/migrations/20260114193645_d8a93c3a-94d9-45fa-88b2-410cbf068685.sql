-- Add new action type for sending messages using templates
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'send_template_message';

-- Add index for faster template lookups by type (for channel compatibility)
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_workspace_type ON templates(workspace_id, type);
