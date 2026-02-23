
-- Add last_message_direction column to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_direction text DEFAULT NULL;

-- Backfill from the most recent message per conversation
UPDATE conversations c
SET last_message_direction = sub.direction
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, direction
  FROM messages
  ORDER BY conversation_id, created_at DESC
) sub
WHERE c.id = sub.conversation_id;
