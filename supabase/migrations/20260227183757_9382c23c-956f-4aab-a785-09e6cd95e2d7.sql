
-- Update trigger to use anon key (public, safe) since edge function has verify_jwt = false
CREATE OR REPLACE FUNCTION public.trigger_extract_contact_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  -- Only process inbound messages with content >= 10 chars
  IF NEW.direction != 'inbound' OR NEW.content IS NULL OR length(trim(NEW.content)) < 10 THEN
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP call via pg_net using anon key (verify_jwt=false on this function)
  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/extract-contact-from-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8"}'::jsonb,
    body := jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'content', NEW.content,
      'workspace_id', NEW.workspace_id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'extract_contact_from_message trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$;
