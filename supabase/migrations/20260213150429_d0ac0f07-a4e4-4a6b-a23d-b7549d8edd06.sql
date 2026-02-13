
-- Remove duplicate messages keeping the latest one per (workspace_id, external_message_id)
DELETE FROM messages m1
USING messages m2
WHERE m1.workspace_id = m2.workspace_id
  AND m1.external_message_id = m2.external_message_id
  AND m1.external_message_id IS NOT NULL
  AND m1.created_at < m2.created_at;

-- Remove duplicate conversations keeping the latest one per (workspace_id, external_thread_id)
DELETE FROM conversations c1
USING conversations c2
WHERE c1.workspace_id = c2.workspace_id
  AND c1.external_thread_id = c2.external_thread_id
  AND c1.external_thread_id IS NOT NULL
  AND c1.created_at < c2.created_at;

-- Now create the unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique
ON messages (workspace_id, external_message_id)
WHERE external_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external_thread_unique
ON conversations (workspace_id, external_thread_id)
WHERE external_thread_id IS NOT NULL;
