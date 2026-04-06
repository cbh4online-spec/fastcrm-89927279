
-- Add ticket notification columns to telegram_config
ALTER TABLE public.telegram_config
  ADD COLUMN IF NOT EXISTS notify_new_tickets boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_ticket_assigned boolean NOT NULL DEFAULT true;

-- Function to handle ticket notifications (new ticket + assignment)
CREATE OR REPLACE FUNCTION public.notify_ticket_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_url TEXT;
  v_anon_key TEXT;
  v_event_type TEXT;
  v_title TEXT;
  v_message TEXT;
  v_ticket_number TEXT;
  v_assigned_name TEXT;
  v_member RECORD;
BEGIN
  v_ticket_number := COALESCE(NEW.ticket_number, 'N/A');

  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'new_ticket';
    v_title := '🎫 Novo Ticket: ' || v_ticket_number;
    v_message := COALESCE(NEW.subject, 'Sem assunto') || ' — Prioridade: ' || COALESCE(NEW.priority, 'normal');
  ELSIF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    v_event_type := 'ticket_assigned';
    -- Get assigned agent name
    SELECT COALESCE(p.full_name, p.email, 'Agente') INTO v_assigned_name
    FROM profiles p WHERE p.id = NEW.assigned_to;
    v_title := '👤 Ticket Atribuído: ' || v_ticket_number;
    v_message := COALESCE(NEW.subject, 'Sem assunto') || ' → ' || COALESCE(v_assigned_name, 'Agente');
  ELSE
    RETURN NEW;
  END IF;

  -- Create in-app notifications for admins/managers
  FOR v_member IN
    SELECT wm.user_id
    FROM workspace_members wm
    JOIN user_roles ur ON ur.user_id = wm.user_id
    WHERE wm.workspace_id = NEW.workspace_id
    AND ur.role IN ('admin', 'moderator')
  LOOP
    INSERT INTO admin_notifications (workspace_id, user_id, type, title, message, metadata)
    VALUES (
      NEW.workspace_id,
      v_member.user_id,
      v_event_type,
      v_title,
      v_message,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'ticket_number', v_ticket_number,
        'assigned_to', NEW.assigned_to,
        'priority', NEW.priority,
        'status', NEW.status
      )
    );
  END LOOP;

  -- If no user_roles entries, fallback to all workspace members with admin/owner role
  IF NOT FOUND THEN
    FOR v_member IN
      SELECT wm.user_id
      FROM workspace_members wm
      WHERE wm.workspace_id = NEW.workspace_id
      AND wm.role IN ('admin', 'owner')
    LOOP
      INSERT INTO admin_notifications (workspace_id, user_id, type, title, message, metadata)
      VALUES (
        NEW.workspace_id,
        v_member.user_id,
        v_event_type,
        v_title,
        v_message,
        jsonb_build_object(
          'ticket_id', NEW.id,
          'ticket_number', v_ticket_number,
          'assigned_to', NEW.assigned_to,
          'priority', NEW.priority,
          'status', NEW.status
        )
      );
    END LOOP;
  END IF;

  -- Also notify the assigned agent directly (for assignment events)
  IF v_event_type = 'ticket_assigned' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO admin_notifications (workspace_id, user_id, type, title, message, metadata)
    VALUES (
      NEW.workspace_id,
      NEW.assigned_to,
      'ticket_assigned_to_me',
      '📋 Ticket atribuído a ti: ' || v_ticket_number,
      COALESCE(NEW.subject, 'Sem assunto'),
      jsonb_build_object(
        'ticket_id', NEW.id,
        'ticket_number', v_ticket_number,
        'priority', NEW.priority
      )
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Send Telegram alert
  SELECT * INTO v_config FROM telegram_config
  WHERE workspace_id = NEW.workspace_id
  AND is_active = true
  AND alert_group_chat_id IS NOT NULL
  AND (
    (v_event_type = 'new_ticket' AND notify_new_tickets = true)
    OR (v_event_type = 'ticket_assigned' AND notify_ticket_assigned = true)
  );

  IF FOUND THEN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
    SELECT decrypted_secret INTO v_anon_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;

    IF v_url IS NOT NULL AND v_anon_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/telegram-send',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'action', 'sendAlertInternal',
          'workspace_id', NEW.workspace_id,
          'alert_type', v_event_type,
          'text', v_title || E'\n' || v_message
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers on support_tickets
DROP TRIGGER IF EXISTS trg_notify_new_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_events();

DROP TRIGGER IF EXISTS trg_notify_ticket_assigned ON public.support_tickets;
CREATE TRIGGER trg_notify_ticket_assigned
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
  EXECUTE FUNCTION public.notify_ticket_events();
