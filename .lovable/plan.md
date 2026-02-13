

# Bloco 1 – Validacao e Correcao da Infraestrutura Base

## Estado Atual

Auditei as 5 tabelas principais do motor de conversas. Aqui esta o resumo:

### Tabelas e Campos Criticos

| Tabela | workspace_id | contact_id | channel | status | unread_count | assigned_to | updated_at |
|---|---|---|---|---|---|---|---|
| conversations | OK | OK | OK (channel) | OK (default 'open') | OK (default 0) | OK (assigned_to) | OK |
| messages | OK | -- | -- | -- | -- | -- | Sem coluna |
| contacts | OK | -- | -- | OK (client_status) | -- | OK | OK |
| leads | OK | -- | -- | OK (default 'new') | -- | OK | OK |
| crm_activities | OK | OK | -- | -- | -- | -- | Sem coluna |

### Triggers Existentes

| Tabela | updated_at | Logs automaticos | Outros |
|---|---|---|---|
| conversations | OK | -- | -- |
| messages | NAO TEM | OK (log_message_activity) | trg_message_priority, trigger_update_lead_last_contact |
| contacts | OK | OK (log_contact_creation) | auto_create_company, sync_client_number, cache |
| leads | OK | OK (log_lead_creation, log_lead_status_change) | cache |
| crm_activities | NAO TEM | -- | -- |

### RLS (Row Level Security)

| Tabela | RLS Ativo | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| conversations | OK | workspace_member | workspace_member | workspace_member | admin |
| messages | OK | workspace_member | workspace_member | workspace_member | Sem policy (apenas super admin) |
| contacts | OK | workspace_member | member + created_by | workspace_member | admin |
| leads | OK | workspace_member | member + created_by | workspace_member | admin |
| crm_activities | OK | workspace_member (subquery) | workspace_member (subquery) | Sem policy | Sem policy |

### Trigger de unread_count

**NAO EXISTE** — nenhum trigger incrementa automaticamente o `unread_count` quando uma mensagem inbound chega. Isto e feito manualmente no codigo (normalize-message.ts) apenas para novas conversas.

---

## O que sera corrigido

### 1. Trigger `updated_at` em messages
Adicionar trigger `update_messages_updated_at` (reusa a funcao `update_updated_at_column` existente). Requer adicionar a coluna `updated_at` a tabela messages primeiro.

### 2. Trigger auto-incremento de `unread_count`
Criar funcao `increment_unread_on_inbound_message()` que, ao inserir mensagem com `direction = 'inbound'`, faz `UPDATE conversations SET unread_count = unread_count + 1 WHERE id = NEW.conversation_id`.

### 3. Coluna `updated_at` em `crm_activities` + trigger
Adicionar coluna com default `now()` e trigger automatico.

### 4. Politicas RLS em falta
- **messages**: adicionar DELETE para workspace members (admin-only, consistente com conversations)
- **crm_activities**: adicionar UPDATE e DELETE para workspace members (admin-only para delete)

---

## Plano Tecnico (Migracao SQL)

Uma unica migracao com:

```text
-- 1. Coluna updated_at em messages
ALTER TABLE messages ADD COLUMN updated_at timestamptz DEFAULT now();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Coluna updated_at em crm_activities  
ALTER TABLE crm_activities ADD COLUMN updated_at timestamptz DEFAULT now();
CREATE TRIGGER update_crm_activities_updated_at BEFORE UPDATE ON crm_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Trigger auto-incremento unread_count
CREATE FUNCTION increment_unread_on_inbound_message() ...
CREATE TRIGGER trg_increment_unread AFTER INSERT ON messages ...

-- 4. RLS policies em falta
CREATE POLICY "Admins can delete messages" ON messages FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Members can update activities" ON crm_activities FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete activities" ON crm_activities FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));
```

### Sem alteracoes de codigo

Todas as correcoes sao a nivel de base de dados (triggers + RLS). O codigo frontend e edge functions nao precisam de alteracoes — os triggers passam a funcionar automaticamente.

### Riscos

- O trigger de `unread_count` pode duplicar incrementos se o `normalize-message.ts` ja faz isso para novas conversas. Vou verificar e, se necessario, remover a logica duplicada do normalize layer ou condicionar o trigger para ignorar conversas recem-criadas.

