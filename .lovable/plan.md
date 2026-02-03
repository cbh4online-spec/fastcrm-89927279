

# Plano: Corrigir Erro "entity_type_check" ao Criar Reuniões

## Problema Identificado

O erro anterior foi corrigido (activity_type_check), mas agora há um **segundo check constraint** a falhar:

```
"new row for relation \"crm_activities\" violates check constraint \"crm_activities_entity_type_check\""
```

### Estado Atual do Constraint

| entity_type permitidos | O trigger está a usar |
|------------------------|----------------------|
| `lead` | `meeting` |
| `opportunity` | |
| `contact` | |
| `company` | |
| `conversation` | |

O trigger `log_meeting_to_crm` está a inserir registos com `entity_type = 'meeting'`, mas este valor não está permitido pelo check constraint.

## Solução

Atualizar o check constraint `crm_activities_entity_type_check` para incluir o tipo `meeting`.

### SQL de Migração

```sql
-- Drop the existing check constraint
ALTER TABLE public.crm_activities 
DROP CONSTRAINT IF EXISTS crm_activities_entity_type_check;

-- Create new check constraint with 'meeting' entity type added
ALTER TABLE public.crm_activities 
ADD CONSTRAINT crm_activities_entity_type_check 
CHECK (entity_type = ANY (ARRAY[
  'lead'::text, 
  'opportunity'::text, 
  'contact'::text, 
  'company'::text, 
  'conversation'::text,
  'meeting'::text  -- Novo tipo para reuniões
]));
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| Nova migração SQL | Atualizar check constraint `entity_type_check` para incluir `meeting` |

## Complexidade

Baixa - Apenas uma migração de base de dados.

## Resultado Esperado

Após a migração:
1. O trigger `log_meeting_to_crm` conseguirá inserir registos com `entity_type = 'meeting'`
2. A criação e edição de reuniões funcionará sem erros
3. O histórico de atividades CRM incluirá eventos de reuniões corretamente

