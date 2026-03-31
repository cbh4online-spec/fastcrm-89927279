

## Diagnóstico: Controlo de Ponto sem dados

### Problema
Idêntico ao dos check-ins: `HRTimeTrackingPage` usa `useHREmployees("active")` que retorna IDs de `workspace_members`. Mas:
- `useClockAction` envia `employee_id` para a edge function que espera IDs de `hr_employees`
- `useHRWorkSessions` filtra por `employee_id` que é FK para `hr_employees`
- O join `hr_employees(full_name, ...)` nas sessões usa IDs de `hr_employees`

Resultado: clock-in falha com FK violation, filtro não encontra sessões, tabela vazia.

### Solução (1 passo)

Substituir `useHREmployees("active")` por `useHREmployeesList` (já criado em `useCheckins.ts`) na página `HRTimeTrackingPage.tsx`.

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/pages/dashboard/hr/HRTimeTrackingPage.tsx` | Trocar import de `useHREmployees` por `useHREmployeesList` de `useCheckins.ts` |

### Critérios de Aceitação
1. Funcionários aparecem no dropdown e nos botões de clock-in/out
2. Clock-in/out regista com sucesso
3. Sessões aparecem na tabela com nome do funcionário

