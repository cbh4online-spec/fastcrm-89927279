

# Plano: Corrigir Erro "violates check constraint" ao Criar Reuniões

## Problema Identificado

Existe um **trigger** na base de dados (`log_meeting_to_crm`) que é disparado automaticamente quando uma reunião é criada ou atualizada. Este trigger tenta inserir registos na tabela `crm_activities` com tipos de atividade relacionados a reuniões.

**O conflito:**

| Trigger usa estes valores | Check constraint permite |
|---------------------------|-------------------------|
| `meeting_scheduled` | `message_sent`, `message_received`, `status_changed` |
| `meeting_confirmed` | `stage_changed`, `opportunity_created`, `opportunity_updated` |
| `meeting_completed` | `opportunity_won`, `opportunity_lost`, `lead_created` |
| `meeting_cancelled` | `lead_updated`, `lead_contacted`, `task_created` |
| `meeting_no_show` | `task_completed`, `note_added`, `tag_added` |
| `meeting_outcome` | `tag_removed`, `assigned`, `automation_triggered` |
| | `proposal_sent`, `proposal_viewed`, `proposal_accepted` |
| | `followup_scheduled`, `followup_completed`, `custom` |

Como se pode ver, **nenhum** dos tipos de atividade de reunião está permitido pelo check constraint.

## Solucao

Atualizar o check constraint para incluir os tipos de atividade de reunião.

### SQL de Migração

```sql
-- Drop the existing check constraint
ALTER TABLE public.crm_activities 
DROP CONSTRAINT IF EXISTS crm_activities_activity_type_check;

-- Create new check constraint with meeting activity types added
ALTER TABLE public.crm_activities 
ADD CONSTRAINT crm_activities_activity_type_check 
CHECK (activity_type = ANY (ARRAY[
  -- Existing types
  'message_sent'::text, 
  'message_received'::text, 
  'status_changed'::text, 
  'stage_changed'::text, 
  'opportunity_created'::text, 
  'opportunity_updated'::text, 
  'opportunity_won'::text, 
  'opportunity_lost'::text, 
  'lead_created'::text, 
  'lead_updated'::text, 
  'lead_contacted'::text, 
  'task_created'::text, 
  'task_completed'::text, 
  'note_added'::text, 
  'tag_added'::text, 
  'tag_removed'::text, 
  'assigned'::text, 
  'automation_triggered'::text, 
  'proposal_sent'::text, 
  'proposal_viewed'::text, 
  'proposal_accepted'::text, 
  'followup_scheduled'::text, 
  'followup_completed'::text, 
  'custom'::text,
  -- New meeting types
  'meeting_scheduled'::text,
  'meeting_confirmed'::text,
  'meeting_completed'::text,
  'meeting_cancelled'::text,
  'meeting_no_show'::text,
  'meeting_outcome'::text
]));
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| Nova migração SQL | Atualizar check constraint para incluir tipos de atividade de reunião |

## Complexidade

Baixa - Apenas uma migração de base de dados.

## Resultado Esperado

Após a migração:
1. O trigger `log_meeting_to_crm` conseguirá inserir registos com tipos de atividade de reunião
2. A criação de reuniões funcionará sem erros
3. O histórico de atividades CRM incluirá eventos de reuniões

