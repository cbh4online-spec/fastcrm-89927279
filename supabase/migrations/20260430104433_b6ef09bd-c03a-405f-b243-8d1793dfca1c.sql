
CREATE OR REPLACE FUNCTION public.fn_notify_team_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  member_record RECORD;
  author_name TEXT;
  entity_label TEXT;
  mention_uuids uuid[];
BEGIN
  IF NEW.note_type = 'team' THEN
    SELECT full_name INTO author_name
    FROM public.profiles WHERE user_id = NEW.created_by;
    author_name := COALESCE(author_name, 'Alguém');

    SELECT name INTO entity_label FROM public.contacts WHERE id = NEW.entity_id
    UNION ALL SELECT name FROM public.leads WHERE id = NEW.entity_id
    UNION ALL SELECT name FROM public.companies WHERE id = NEW.entity_id
    LIMIT 1;
    entity_label := COALESCE(entity_label, 'registo');

    -- Convert text[] mentions to uuid[] safely (skip invalid values)
    BEGIN
      SELECT COALESCE(array_agg(m::uuid), ARRAY[]::uuid[])
      INTO mention_uuids
      FROM unnest(COALESCE(NEW.mentions, '{}'::text[])) AS m
      WHERE m ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
    EXCEPTION WHEN OTHERS THEN
      mention_uuids := ARRAY[]::uuid[];
    END;

    FOR member_record IN
      SELECT user_id FROM public.workspace_members
      WHERE workspace_id = NEW.workspace_id AND user_id != NEW.created_by
    LOOP
      INSERT INTO public.admin_notifications (
        workspace_id, user_id, type, title, message, metadata
      ) VALUES (
        NEW.workspace_id,
        member_record.user_id,
        CASE WHEN member_record.user_id = ANY(mention_uuids) THEN 'team_mention' ELSE 'team_note' END,
        CASE WHEN member_record.user_id = ANY(mention_uuids)
          THEN author_name || ' mencionou-te numa nota'
          ELSE author_name || ' adicionou uma nota interna'
        END,
        'Sobre ' || entity_label || ': ' || LEFT(COALESCE(NEW.content, ''), 100),
        jsonb_build_object(
          'entity_type', NEW.entity_type,
          'entity_id', NEW.entity_id,
          'note_id', NEW.id,
          'is_mention', member_record.user_id = ANY(mention_uuids)
        )
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;
