

## Diagnóstico: Check-ins não registam

### Problema Identificado

Existe um **conflito de modelos de dados** entre dois sistemas de funcionários:

1. **`hr_employees`** — tabela standalone com UUIDs próprios. Usada por `hr_checkins`, `hr_feedback`, `hr_okrs` (FK references).
2. **`workspace_members` + `hr_employee_profiles`** — modelo unificado. Usada pelo hook `useHREmployees()`.

O hook `useHREmployees("active")` retorna objectos com `id = workspace_member.id`. Quando o utilizador selecciona um funcionário/manager no dropdown e clica "Agendar", o `employee_id` e `manager_id` enviados são IDs de `workspace_members`, mas a tabela `hr_checkins` tem FK para `hr_employees(id)`. Resultado: **foreign key violation silenciosa** (ou erro RLS).

### Solução

Modificar o hook `useHREmployees` (ou criar um helper) para que os dropdowns de check-ins usem os IDs correctos de `hr_employees`. Duas abordagens possíveis:

**Abordagem escolhida**: Na página `HRCheckinsPage`, fazer query directamente à tabela `hr_employees` (que é a fonte de verdade para os módulos de OKRs, feedback e check-ins) em vez de usar `useHREmployees` que retorna IDs de workspace_members.

### Plano (2 passos)

#### 1. Criar hook `useHREmployeesList`
- Novo hook simples em `useCheckins.ts` (ou reutilizar existente) que faz `SELECT id, full_name, avatar_url FROM hr_employees WHERE workspace_id = ? AND status = 'active'`
- Retorna IDs de `hr_employees`, não de `workspace_members`

#### 2. Actualizar `HRCheckinsPage.tsx`
- Substituir `useHREmployees("active")` pelo novo hook nos dropdowns de employee/manager
- Garantir que os IDs passados ao `createCheckin` são de `hr_employees`

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/hooks/hr/useCheckins.ts` | Adicionar `useHREmployeesList()` |
| `src/pages/dashboard/hr/HRCheckinsPage.tsx` | Usar novo hook nos dropdowns |

### Critérios de Aceitação
1. Agendar check-in com sucesso (toast "Check-in agendado" aparece)
2. Check-in aparece na lista após criação
3. Completar check-in funciona (notas, mood, action items)

