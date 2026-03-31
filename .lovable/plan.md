

## Diagnóstico: Turnos não aparecem

### Problema
Mesmo padrão dos check-ins e controlo de ponto: `HRSchedulesPage` usa `useHREmployees("active")` que retorna IDs de `workspace_members`. Mas `hr_schedules.employee_id` é FK para `hr_employees`.

Consequências:
- A grelha semanal mostra funcionários com IDs de `workspace_members`
- Ao atribuir turno, o `employee_id` enviado não existe em `hr_employees` → FK violation
- O `.find()` na grelha nunca faz match entre `schedules[].employee_id` (de `hr_employees`) e `emp.id` (de `workspace_members`)

As tabelas `hr_shifts` e `hr_schedules` **existem** na base de dados e as políticas RLS estão correctas.

### Solução (1 passo)

Substituir `useHREmployees("active")` por `useHREmployeesList` (já criado em `useCheckins.ts`) na página `HRSchedulesPage.tsx`.

### Ficheiro a alterar

| Ficheiro | Acção |
|---|---|
| `src/pages/dashboard/hr/HRSchedulesPage.tsx` | Trocar import para `useHREmployeesList` de `useCheckins.ts` |

### Critérios de Aceitação
1. Tipos de turno podem ser criados e aparecem na lista
2. Funcionários aparecem na grelha semanal com IDs correctos
3. Atribuir turno funciona sem erro FK
4. Turnos atribuídos aparecem na grelha com badge colorido

