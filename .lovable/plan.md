

## Fase 5: Onboarding de Colaboradores — Plano de Implementação

### Diagnóstico

- Nenhuma tabela `hr_onboarding*` existe na BD
- Nenhum hook, página ou edge function de onboarding HR existe
- `hr_employees` tem `position_id`, `department_id`, `manager_id` — necessários para buddy matching
- **Nota**: O guia referencia `hr_positions` mas essa tabela não existe no schema actual. O buddy match usará `job_title` e `department` em vez disso.
- A rota `/dashboard/hr/onboarding` não existe no `HRRoutes.tsx`

---

### Plano (5 passos)

#### 1. Migração SQL — 5 tabelas novas

| Tabela | Finalidade |
|---|---|
| `hr_onboarding_templates` | Templates de onboarding por workspace |
| `hr_onboarding_task_templates` | Tarefas modelo (category, assigned_to_role, due_days) |
| `hr_onboardings` | Instâncias activas (employee, buddy, progress, status) |
| `hr_onboarding_tasks` | Tarefas concretas por onboarding |
| `hr_onboarding_feedback` | Checkpoints 30-60-90 dias |

Inclui: índices, triggers (`updated_at`, `calculate_onboarding_progress`), RLS (templates → HR only, onboardings → employee/buddy/manager/HR, tasks → assigned + HR, feedback → participantes).

**Adaptações ao guia**: Usar validation triggers em vez de CHECK constraints para datas. Remover referência a `hr_positions` (tabela inexistente) — `position_id` fica nullable sem FK.

#### 2. Edge Functions (2 novas)

- **`hr-buddy-match-ai`**: Recebe `new_employee_id` + `workspace_id`, busca funcionários activos, usa Lovable AI (gemini-2.5-pro, sem API key externa) para encontrar top 3 matches com score + reasoning.
- **`hr-onboarding-start`**: Recebe `employee_id`, `template_id`, `buddy_id`, `start_date`. Cria instância de onboarding, gera tarefas a partir do template com datas calculadas, cria checkpoints de feedback (30/60/90).

#### 3. Hooks React (1 ficheiro)

**`src/hooks/hr/useOnboarding.ts`**:
- `useOnboarding(employeeId)` — query onboarding activo com tasks e buddy
- `useOnboardings(workspaceId)` — listar todos os onboardings do workspace
- `useOnboardingTemplates(workspaceId)` — CRUD de templates
- `useStartOnboarding()` — mutation que invoca `hr-onboarding-start`
- `useBuddyMatch()` — mutation que invoca `hr-buddy-match-ai`
- `useUpdateOnboardingTask()` — marcar tarefa como completa
- `useSubmitOnboardingFeedback()` — submeter feedback de checkpoint

#### 4. Página e Componentes

**`src/pages/dashboard/hr/HROnboardingPage.tsx`**:
- **Tabs**: Onboardings Activos | Templates | Arquivo
- **Tab Activos**: Lista de onboardings com progress bar, employee avatar, buddy, status, dias restantes. Expandir para ver checklist de tarefas.
- **Tab Templates**: CRUD de templates com task templates inline (add/edit/remove/reorder).
- **Dialog "Iniciar Onboarding"**: Seleccionar employee → seleccionar template → botão "Sugerir Buddy" (invoca IA) → mostrar top 3 matches com score → confirmar → criar.
- **Detalhe inline**: Checklist de tarefas agrupadas por categoria (HR, IT, Manager, Team, Self), com toggle de conclusão. Secção de feedback 30-60-90 com formulários de satisfação (1-5 estrelas + comentários).

#### 5. Rotas e Navegação

- Adicionar rota `/dashboard/hr/onboarding` ao `HRRoutes.tsx`
- Adicionar link na sidebar/navigation do HR (se gerido por `routeManifest.ts`)

---

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar (5 tabelas + RLS + triggers + índices) |
| `supabase/functions/hr-buddy-match-ai/index.ts` | Criar |
| `supabase/functions/hr-onboarding-start/index.ts` | Criar |
| `src/hooks/hr/useOnboarding.ts` | Criar |
| `src/pages/dashboard/hr/HROnboardingPage.tsx` | Criar |
| `src/routes/HRRoutes.tsx` | Adicionar rota onboarding |

### Critérios de Aceitação

1. Templates CRUD funcional com tarefas modelo
2. Iniciar onboarding gera tarefas com datas calculadas automaticamente
3. Buddy match via IA retorna top 3 com score e reasoning
4. Progress bar actualiza automaticamente ao completar tarefas (trigger BD)
5. Feedback 30-60-90 com formulários de satisfação para employee/manager/buddy
6. RLS garante isolamento por workspace e visibilidade correcta por role
7. Layout responsivo com estados vazios e loading

