

## Time-Off Management — Comparar e Preencher Lacunas

### Diagnóstico

O projecto já tem tabelas base (`hr_absence_types`, `hr_absences`) e hooks (`useHRAbsences`), mas faltam funcionalidades críticas do prompt:

| Componente | Existente | Em falta |
|---|---|---|
| `hr_absence_types` | nome, cor, paid, requires_approval, max_days | `code`, `description`, `can_carry_over`, `advance_notice_days`, `is_active`, `updated_at` |
| `hr_absences` | campos base | `requested_by`, `notes`, `conflict_detected`, `conflict_details` |
| `hr_leave_balances` | Tabela legacy `leave_balances` (user_id based) | Tabela nova ligada a `hr_employees` + `hr_leave_types` com `available_days` computed |
| `hr_public_holidays` | Não existe | Tabela completa |
| Edge Function criar pedido | `useCreateAbsence` faz insert directo | Validação de saldo, cálculo dias úteis (excl. feriados), detecção conflitos |
| Edge Function aprovar | `hr-absence-approve` básico | Gestão atómica de saldos (pending → used) |
| RLS | `workspace_isolation` genérica | Políticas granulares (employee own, manager, hr_admin) |
| UI Calendário | `LeaveCalendar` básico (legacy) | Navegação mês, dados do novo schema |

### Plano de Implementação

#### 1. Migração SQL
- **Evoluir `hr_absence_types`**: adicionar `code TEXT`, `description TEXT`, `can_carry_over BOOLEAN`, `advance_notice_days INTEGER`, `is_active BOOLEAN`, `updated_at`, trigger updated_at, constraint unique(workspace_id, code)
- **Evoluir `hr_absences`**: adicionar `requested_by UUID`, `notes TEXT`, `conflict_detected BOOLEAN`, `conflict_details JSONB`, alterar `total_days` para `DECIMAL(5,2)`
- **Criar `hr_leave_balances`**: employee_id + leave_type_id + year, total/used/pending/carried_over como DECIMAL, `available_days` computed column, unique constraint
- **Criar `hr_public_holidays`**: workspace_id, name, date, country, is_mandatory, unique(workspace_id, date)
- **RLS granular**: políticas separadas para SELECT (employee own + managers) e ALL (admin/owner/hr_admin) nas 4 tabelas
- **Índices**: employee, year, status, dates, holidays

#### 2. Edge Functions
- **`hr-leave-request-create`**: Validar JWT, calcular dias úteis (excluindo fins-de-semana e feriados), verificar saldo, detectar conflitos de sobreposição, criar pedido, actualizar `pending_days` no balance
- **`hr-leave-request-approve`**: Validar JWT, verificar permissões, aprovar/rejeitar, mover dias de pending→used (aprovado) ou remover pending (rejeitado)
- **Manter `hr-absence-approve` e `hr-seed-defaults`** existentes para retrocompatibilidade

#### 3. Hooks (actualizar/criar)
- **`useHRAbsences.ts`**: Actualizar tipos para incluir novos campos (conflict_detected, notes, requested_by); joins com `hr_leave_types` (via absence_type_id)
- **`useHRLeaveBalances.ts`** (novo): Query por employee_id + year, join com leave_type; usa nova tabela `hr_leave_balances`
- **`useHRPublicHolidays.ts`** (novo): CRUD de feriados por workspace
- **Mutações**: `useCreateLeaveRequest` e `useApproveLeaveRequest` a invocar as novas edge functions

#### 4. UI
- **`HRAbsencesPage.tsx`**: Integrar cards de saldo no topo, mostrar conflitos com badge, formulário de pedido usa nova lógica (edge function)
- **Calendário de ausências**: Substituir `LeaveCalendar` legacy por componente com navegação mensal, feriados assinalados, dados do novo schema
- **Gestão de feriados**: Secção em HRSettings ou tab dedicada para CRUD de `hr_public_holidays` (com defaults PT)

#### 5. Limpeza
- Deprecar hooks legacy (`useLeaveRequests`, `useLeaveBalances`) — manter temporariamente para não partir `LeavePage`
- Migrar `LeavePage` para usar os novos hooks quando oportuno

### Critérios de Aceitação
1. Criar pedido calcula dias úteis correctamente (exclui fins-de-semana e feriados)
2. Saldo insuficiente impede criação do pedido
3. Conflitos de sobreposição detectados e sinalizados
4. Aprovação/rejeição actualiza saldos atomicamente
5. RLS garante que funcionários vêem apenas os seus pedidos; managers/admins vêem todos
6. Calendário navega entre meses e mostra ausências aprovadas
7. Feriados PT configuráveis por workspace

### Riscos
- Coluna computed `available_days` com `GENERATED ALWAYS AS` — verificar compatibilidade com updates parciais
- Legacy `leave_requests`/`leave_balances` ainda usadas em `LeavePage` — não remover até migração completa
- Edge functions existentes (`hr-absence-approve`) podem ser chamadas por código antigo — manter activas

