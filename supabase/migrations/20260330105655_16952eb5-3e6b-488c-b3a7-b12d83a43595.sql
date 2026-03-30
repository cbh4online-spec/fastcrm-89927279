
-- Fix the function to use correct column name 'content' instead of 'body'
CREATE OR REPLACE FUNCTION public.update_conversation_last_message_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_direction = NEW.direction,
    last_message_at = NEW.created_at,
    last_message_preview = substring(NEW.content from 1 for 255)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Re-backfill all existing conversations from their latest message
UPDATE public.conversations c
SET
  last_message_direction = sub.direction,
  last_message_at = sub.created_at,
  last_message_preview = substring(sub.content from 1 for 255)
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    direction,
    created_at,
    content
  FROM public.messages
  ORDER BY conversation_id, created_at DESC
) sub
WHERE c.id = sub.conversation_id;
