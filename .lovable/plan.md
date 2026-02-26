

# Notificações para Notas Internas da Equipa

## Abordagem

Criar um trigger PostgreSQL na tabela `entity_notes` que, ao inserir uma nota com `note_type = 'team'`, gera notificações em `admin_notifications` para todos os membros do workspace (exceto o autor). Adicionalmente, se a nota tiver `mentions`, gera notificações específicas para os mencionados com tipo diferenciado.

## Alterações

### 1. Migração SQL — Trigger `notify_team_note`

```sql
CREATE OR REPLACE FUNCTION public.fn_notify_team_note()
RETURNS TRIGGER AS $$
DECLARE
  member_record RECORD;
  author_name TEXT;
  entity_label TEXT;
  mention_ids TEXT[];
BEGIN
  IF NEW.note_type = 'team' THEN
    -- Get author name
    SELECT full_name INTO author_name 
    FROM public.profiles WHERE user_id = NEW.created_by;
    author_name := COALESCE(author_name, 'Alguém');
    
    -- Get entity name for context
    SELECT name INTO entity_label FROM public.contacts WHERE id = NEW.entity_id
    UNION ALL SELECT name FROM public.leads WHERE id = NEW.entity_id
    UNION ALL SELECT name FROM public.companies WHERE id = NEW.entity_id
    LIMIT 1;
    entity_label := COALESCE(entity_label, 'registo');

    -- Get mentions array
    mention_ids := COALESCE(NEW.mentions, '{}');

    -- Notify all workspace members except author
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
```

Trigger: `AFTER INSERT ON entity_notes`

### 2. Actualizar `NotificationsDropdown.tsx`

Adicionar ícones para os novos tipos `team_note` e `team_mention` no mapa `typeIcons`.

### Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Trigger `fn_notify_team_note` + `AFTER INSERT ON entity_notes` |
| `src/components/layout/NotificationsDropdown.tsx` | Ícones para `team_note` / `team_mention` |

