ALTER TABLE ai_message_audit 
  ADD COLUMN IF NOT EXISTS memory_context JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS detected_intent JSONB DEFAULT '{}';