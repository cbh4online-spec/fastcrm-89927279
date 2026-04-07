CREATE OR REPLACE FUNCTION public.notify_telegram_new_deal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config RECORD;
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  SELECT * INTO v_config FROM telegram_config 
  WHERE workspace_id = NEW.workspace_id 
  AND notify_new_deals = true 
  AND alert_group_chat_id IS NOT NULL;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://eumnfkccyvlyoyjchiwe.supabase.co'
  ) || '/functions/v1/telegram-send';
  
  v_anon_key := coalesce(
    current_setting('app.settings.supabase_anon_key', true),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC8gxzMj3fWbhqbrdXOd8'
  );

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'action', 'sendAlertInternal',
      'workspace_id', NEW.workspace_id,
      'alert_type', 'new_deal',
      'text', '💰 Nova Oportunidade: ' || COALESCE(NEW.title, 'Sem título') || E'\n💵 Valor: ' || COALESCE(NEW.value::text, 'N/A') || '€'
    )
  );

  RETURN NEW;
END;
$function$;