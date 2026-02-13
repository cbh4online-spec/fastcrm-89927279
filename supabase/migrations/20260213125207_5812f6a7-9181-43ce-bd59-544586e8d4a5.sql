
-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to trigger priority recalculation on new inbound messages
CREATE OR REPLACE FUNCTION public.notify_new_message_priority()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/calculate-conversation-priority',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8"}'::jsonb,
    body := json_build_object('conversation_id', NEW.conversation_id)::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on messages table for inbound messages
CREATE TRIGGER trg_message_priority
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.direction = 'inbound')
EXECUTE FUNCTION public.notify_new_message_priority();
