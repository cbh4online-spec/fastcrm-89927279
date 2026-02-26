
CREATE OR REPLACE FUNCTION public.fn_notify_team_note()
RETURNS TRIGGER AS $$
DECLARE
  member_record RECORD;
  author_name TEXT;
  entity_label TEXT;
  mention_ids TEXT[];
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

    mention_ids := COALESCE(NEW.mentions, '{}');

    FOR member_record IN
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id = NEW.workspace_id AND user_id != NEW.created_by
    LOOP
      INSERT INTO public.admin_notifications (
        workspace_id, user_id, type, title, message, metadata
      ) VALUES (
        NEW.workspace_id,
        member_record.user_id,
        CASE WHEN member_record.user_id = ANY(mention_ids) THEN 'team_mention' ELSE 'team_note' END,
        CASE WHEN member_record.user_id = ANY(mention_ids) 
          THEN author_name || ' mencionou-te numa nota'
          ELSE author_name || ' adicionou uma nota interna'
        END,
        'Sobre ' || entity_label || ': ' || LEFT(NEW.content, 100),
        jsonb_build_object(
          'entity_type', NEW.entity_type, 
          'entity_id', NEW.entity_id,
          'note_id', NEW.id,
          'is_mention', member_record.user_id = ANY(mention_ids)
        )
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_team_note ON public.entity_notes;
CREATE TRIGGER trg_notify_team_note
  AFTER INSERT ON public.entity_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_team_note();
