
-- Create a database function that calls the extract-contact-from-messages edge function
-- via pg_net for async HTTP call after message insert
CREATE OR REPLACE FUNCTION public.trigger_extract_contact_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
BEGIN
  -- Only process inbound messages with content
  IF NEW.direction != 'inbound' OR NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service key from vault or env
  SELECT decrypted_secret INTO _supabase_url FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  -- If vault secrets not available, skip silently
  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP call via pg_net
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/extract-contact-from-messages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'content', NEW.content,
      'workspace_id', NEW.workspace_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block message insertion
  RAISE WARNING 'extract_contact_from_message trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on messages table for inbound messages
DROP TRIGGER IF EXISTS after_message_insert_extract_contact ON public.messages;
CREATE TRIGGER after_message_insert_extract_contact
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_extract_contact_from_message();
