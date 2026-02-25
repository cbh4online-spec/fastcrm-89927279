

# Notificações Automáticas de Transição de Lifecycle Stage

## Contexto

Já existe:
- Tabela `admin_notifications` com realtime habilitado, RLS policies, e índices
- Hook `useAdminNotifications` com subscrição realtime que invalida queries automaticamente
- UI de notificações no `NotificationsDropdown` (actualmente usa dados demo estáticos)
- Trigger `trg_contact_lifecycle` que transiciona automaticamente o `lifecycle_stage`
- Trigger `trg_contact_audit` que regista alterações no `contact_audit_log`

## Solução

Criar um **trigger PostgreSQL AFTER UPDATE** na tabela `contacts` que detecta mudanças em `lifecycle_stage` e insere uma notificação na tabela `admin_notifications`. A UI já consome esta tabela via realtime.

### Alterações

#### 1. Migração SQL — Trigger `fn_notify_lifecycle_transition`

Função que executa `AFTER UPDATE` em `contacts`:
- Verifica se `lifecycle_stage` mudou (`OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage`)
- Insere registo em `admin_notifications` com:
  - `type`: `'lifecycle_transition'`
  - `title`: Nome do contacto + transição (ex: "João Silva avançou para Prospect")
  - `message`: Detalhe da transição (ex: "Lead → Prospect")
  - `metadata`: `{ contact_id, old_stage, new_stage }`
  - `workspace_id`: do contacto

```sql
CREATE OR REPLACE FUNCTION public.fn_notify_lifecycle_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lifecycle_stage IS DISTINCT FROM NEW.lifecycle_stage THEN
    INSERT INTO public.admin_notifications (workspace_id, type, title, message, metadata)
    VALUES (
      NEW.workspace_id,
      'lifecycle_transition',
      COALESCE(NEW.name, NEW.email, 'Contacto') || ' → ' || NEW.lifecycle_stage,
      OLD.lifecycle_stage || ' → ' || NEW.lifecycle_stage,
      jsonb_build_object('contact_id', NEW.id, 'old_stage', OLD.lifecycle_stage, 'new_stage', NEW.lifecycle_stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 2. `src/components/layout/NotificationsDropdown.tsx`

Substituir os dados demo estáticos pelo hook `useAdminNotifications`:
- Consumir `useAdminNotifications()` em vez do estado local com `demoNotifications`
- Mapear `type` para ícones (incluindo `lifecycle_transition` → ícone de GitBranch ou similar)
- Usar `markAsRead` e `markAllAsRead` do hook
- Manter o layout actual mas com dados reais e realtime

#### 3. Mapeamento de tipos de notificação

Adicionar ao `NotificationsDropdown` o ícone para o novo tipo:
- `lifecycle_transition` → ícone `GitBranch` com cor verde

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Criar trigger `fn_notify_lifecycle_transition` |
| `src/components/layout/NotificationsDropdown.tsx` | Substituir dados demo por `useAdminNotifications` + suporte ao tipo `lifecycle_transition` |

