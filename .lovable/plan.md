

## Performance & OKRs — Plano de Implementação

### Diagnóstico

Nenhuma das 4 tabelas do prompt existe (`hr_okrs`, `hr_key_results`, `hr_feedback`, `hr_checkins`). Não há hooks, páginas ou rotas para OKRs/feedback/check-ins. A infraestrutura base (hr_employees, workspaces, workspace_members) está operacional. O padrão RLS do projecto usa `workspace_members` com roles `admin`/`owner`.

---

### Plano

#### 1. Migração SQL — 4 tabelas + índices + RLS + triggers

| Tabela | Campos-chave |
|---|---|
| `hr_okrs` | workspace_id, employee_id, type (company/team/individual), parent_okr_id, objective, period, year, start_date, end_date, status, progress, created_by |
| `hr_key_results` | okr_id, description, metric_type, start_value, target_value, current_value, unit, progress (computed) |
| `hr_feedback` | workspace_id, from/to_employee_id, feedback_type, title, content, is_private, is_anonymous, read_at |
| `hr_checkins` | workspace_id, employee_id, manager_id, scheduled_at, completed_at, status, agenda, notes, action_items (JSONB), mood_rating |

- **RLS**: OKRs visíveis no workspace; editáveis pelo próprio + admins/owners. Feedback visível pelo remetente/destinatário + não-privado para workspace. Check-ins visíveis por employee + manager.
- **Nota**: Usar validation triggers em vez de CHECK constraints para datas (`end_date > start_date`), conforme regras do projecto. `hr_key_results.progress` como computed column STORED.
- **Índices**: employee, period/year, status, scheduled_at, from/to_employee.
- **Triggers**: `update_updated_at_column()` em `hr_okrs`, `hr_key_results`, `hr_checkins`.

#### 2. Hooks (4 ficheiros novos em `src/hooks/hr/`)

- **`useOKRs.ts`**: `useOKRs(employeeId?)` com join a `hr_key_results` e `hr_employees`; `useCreateOKR` (insere OKR + key results atómicamente); `useUpdateKeyResultProgress`; `useDeleteOKR`.
- **`useFeedback.ts`**: `useFeedback(employeeId)` com join a employees; `useCreateFeedback`; `useMarkFeedbackRead`.
- **`useCheckins.ts`**: `useCheckins(employeeId)` com join a employees; `useCreateCheckin`; `useUpdateCheckin` (completar, adicionar notas/action items).

#### 3. Páginas e Componentes UI (3 páginas novas)

- **`HROKRsPage.tsx`** (`/dashboard/hr/okrs`): Board de OKRs com filtros por tipo/período/status. Cards com progress bars por objective + key results. Dialog para criar/editar OKR com key results inline. Cálculo automático de progresso do OKR a partir dos key results.
- **`HRFeedbackPage.tsx`** (`/dashboard/hr/feedback`): Lista de feedback recebido/enviado com tabs. Formulário para dar feedback (tipo, destinatário, conteúdo, privado/anónimo). Badge de não-lido.
- **`HRCheckinsPage.tsx`** (`/dashboard/hr/checkins`): Lista de check-ins (agendados/concluídos). Formulário de criação (employee, data, agenda). Vista de check-in com notas, action items e mood rating.

#### 4. Rotas

Adicionar 3 rotas em `HRRoutes.tsx`:
- `/dashboard/hr/okrs`
- `/dashboard/hr/feedback`
- `/dashboard/hr/checkins`

#### 5. Integração no HR Dashboard

Adicionar widgets resumo no `HRDashboardPage.tsx`: OKRs activos, feedback pendente de leitura, próximos check-ins.

---

### Critérios de Aceitação

1. OKR progress calcula-se automaticamente a partir dos key results (computed column)
2. OKRs em cascata (company → team → individual) via `parent_okr_id`
3. Feedback anónimo esconde `from_employee` na UI
4. Feedback privado visível apenas por destinatário + admins
5. Check-ins com mood rating (1-5) e action items JSONB
6. RLS garante isolamento por workspace e permissões por role
7. Estados vazios, loading e erro tratados em todas as páginas

### Riscos

- Computed column `progress` em `hr_key_results` com divisão por zero — protegido com CASE WHEN
- `parent_okr_id` self-reference pode causar loops — sem validação recursiva nesta fase
- Roles `hr_admin`/`manager` podem não existir em `workspace_members.role` — usar apenas `admin`/`owner` nas policies, consistente com o resto do projecto

