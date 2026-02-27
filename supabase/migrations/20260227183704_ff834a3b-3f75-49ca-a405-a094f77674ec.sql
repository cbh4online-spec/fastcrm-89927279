
-- Update the trigger function to use Supabase config settings instead of vault
CREATE OR REPLACE FUNCTION public.trigger_extract_contact_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  _supabase_url text := 'https://eumnfkccyvlyoyjchiwe.supabase.co';
  _service_key text;
BEGIN
  -- Only process inbound messages with content
  IF NEW.direction != 'inbound' OR NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RETURN NEW;
  END IF;

  -- Quick check: skip very short messages unlikely to contain contact data
  IF length(NEW.content) < 10 THEN
    RETURN NEW;
  END IF;

  -- Get service role key from Supabase secrets
  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_service_role_key' 
  LIMIT 1;

  IF _service_key IS NULL THEN
    -- Fallback: try the SUPABASE_SERVICE_ROLE_KEY env
    _service_key := current_setting('supabase.service_role_key', true);
  END IF;

  IF _service_key IS NULL THEN
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
