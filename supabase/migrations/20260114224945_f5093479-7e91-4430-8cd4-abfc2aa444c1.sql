-- Add new inbox-based automation triggers
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'first_message_from_lead';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'conversation_resolved';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'conversation_priority_changed';