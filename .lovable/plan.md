

## Diagnóstico

O botão "Iniciar Trabalho" no Dashboard usa `useTimeEntries` → grava na tabela `time_entries`.
A página "Controlo de Ponto" (HR) usa `useHRWorkSessions` → lê da tabela `hr_work_sessions`.

São **dois sistemas completamente separados**. O clock-in do dashboard nunca aparece no Controlo de Ponto porque grava numa tabela diferente.

A solução correcta é fazer o botão do Dashboard usar o sistema HR (`hr-clock-action`), que é o sistema completo com sessões, overtime, anomalias e regras laborais.

---

## Plano

### 1. Alterar `ClockInOutButton.tsx`
- Substituir `useTimeEntries` por `useClockAction` (do sistema HR)
- Precisamos do `employee_id` do utilizador autenticado → buscar via `hr_employees.user_id`

### 2. Criar hook `useCurrentEmployee`
Novo hook `src/hooks/hr/useCurrentEmployee.ts`:
- Consulta `hr_employees` filtrando por `user_id = auth.uid()` e `workspace_id`
- Retorna `employeeId`, `employeeName`, `isLoading`
- Se o utilizador não tiver registo em `hr_employees`, mostrar mensagem adequada

### 3. Alterar `ClockInOutButton.tsx`
- Usar `useCurrentEmployee()` para obter o `employee_id`
- Usar `useClockAction()` para clock-in/out via edge function `hr-clock-action`
- Usar `useHRWorkSessions(employeeId, today, today)` para detectar sessão activa (substituindo `activeEntry`)
- Manter a UI actual (timer, weather, greeting) — só mudar a fonte de dados
- Se não houver `employee_id`, mostrar aviso "Configure o seu perfil de colaborador"

### 4. Verificar sessão activa
- Em vez de ler de `time_entries`, ler a sessão aberta de `hr_work_sessions` onde `clock_out_at IS NULL` e `session_date = today`
- O timer usa `clock_in_at` da sessão HR

---

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/hr/useCurrentEmployee.ts` | **Criar** — mapeia user_id → employee_id |
| `src/components/hr/ClockInOutButton.tsx` | **Alterar** — usar sistema HR em vez de `time_entries` |

## Impacto
- A tabela `time_entries` deixa de ser usada pelo botão do Dashboard
- Todos os registos passam pelo sistema HR unificado (sessões, overtime, anomalias)
- Zero alterações no backend — o `hr-clock-action` já suporta tudo

