

# Transições Automáticas de Lifecycle Stage Baseadas em Eventos

## Contexto

O sistema já tem:
- Coluna `lifecycle_stage` na tabela `contacts` (visitor/lead/prospect/sales/onboarding/customer/churned)
- Coluna `lead_status` (new/contacted/qualified/unqualified/customer/churned)
- Coluna `client_status` (ativo/inativo/etc.)
- Trigger de auditoria `trg_contact_audit` que regista alterações de campos
- `ConvertLeadDialog` que cria contactos a partir de leads (mas não define lifecycle_stage)
- `contact_audit_log` para tracking de alterações

Não existe nenhuma lógica automática para transicionar o `lifecycle_stage` quando eventos ocorrem.

## Solução

Criar um **trigger PostgreSQL** que automaticamente transiciona o `lifecycle_stage` baseado em alterações de campos existentes, sem necessidade de lógica frontend.

### Regras de Transição

| Evento | De | Para |
|--------|----|----|
| `lead_status` muda para `contacted` ou `qualified` | visitor | lead |
| `lead_status` muda para `qualified` | lead | prospect |
| `lead_status` muda para `customer` | qualquer (visitor/lead/prospect) | sales |
| `client_status` muda para `ativo` | qualquer (visitor/lead/prospect/sales) | onboarding |
| `client_status` é `ativo` há mais de 30 dias (ou `client_since` existe) | onboarding | customer |
| `client_status` muda para `inativo` ou `churned` | customer | churned |
| Contacto criado via conversão de lead (`ConvertLeadDialog`) | — (default visitor) | lead |

A lógica é: transições só avançam (nunca retrocedem automaticamente), excepto para `churned`.

### Alterações

#### 1. Migração SQL — Trigger `fn_lifecycle_auto_transition`

Criar um trigger `BEFORE UPDATE` na tabela `contacts` que:
- Verifica se `lead_status` ou `client_status` mudaram
- Aplica as regras de transição acima
- Só avança o lifecycle (nunca retrocede), excepto para churned
- Executa **antes** do trigger de auditoria para que a mudança de `lifecycle_stage` seja registada no audit log

```sql
CREATE OR REPLACE FUNCTION public.fn_lifecycle_auto_transition()
RETURNS TRIGGER AS $$
DECLARE
  stage_order int;
  new_stage text;
  current_order int;
BEGIN
  -- Só processar se lead_status ou client_status mudaram
  IF OLD.lead_status IS NOT DISTINCT FROM NEW.lead_status
     AND OLD.client_status IS NOT DISTINCT FROM NEW.client_status THEN
    RETURN NEW;
  END IF;
  
  -- Mapa de ordem para evitar retrocesso
  -- visitor=0, lead=1, prospect=2, sales=3, onboarding=4, customer=5, churned=-1
  
  -- Regras de transição...
  -- Actualizar NEW.lifecycle_stage se aplicável
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 2. Migração SQL — Trigger `BEFORE INSERT` para novos contactos

Quando um contacto é criado com `lead_status != 'new'`, definir lifecycle_stage adequado (ex: se `lead_status = 'qualified'`, definir como `prospect`).

#### 3. `src/components/crm/ConvertLeadDialog.tsx`

Actualizar `createContact.mutateAsync` para incluir `lifecycle_stage: 'lead'` nos dados de criação, garantindo que contactos criados a partir de leads começam no estágio correcto.

#### 4. `src/hooks/useCustomerLifecycle.ts`

Adicionar a coluna `lifecycle_stage` ao array de colunas auditadas no trigger existente (se não estiver já), para que transições automáticas sejam registadas no `contact_audit_log`.

#### 5. `src/components/lifecycle/CustomerLifecycleFlow.tsx` (melhoria menor)

Adicionar tooltip nos nós indicando que transições automáticas estão activas.

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Criar trigger `fn_lifecycle_auto_transition` + adicionar `lifecycle_stage` ao audit |
| `src/components/crm/ConvertLeadDialog.tsx` | Passar `lifecycle_stage: 'lead'` na criação |

## Detalhe Técnico

O trigger tem prioridade de execução definida pelo nome (ordem alfabética em PostgreSQL para triggers `BEFORE UPDATE`). O trigger `fn_lifecycle_auto_transition` será nomeado `trg_contact_lifecycle` que executa antes de `trg_contact_audit`, garantindo que a transição automática é auditada.

Ordem numérica para stages (para evitar retrocesso):
- `visitor` = 0, `lead` = 1, `prospect` = 2, `sales` = 3, `onboarding` = 4, `customer` = 5
- `churned` é especial: pode ser aplicado a qualquer estágio

