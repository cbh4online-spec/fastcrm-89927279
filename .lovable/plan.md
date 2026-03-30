

## Camada de Execução Operacional — Plano de Execução

### Diagnóstico

**Infraestrutura existente:**
- `CommandQuickActions` — executa ações inline (create_task, schedule_meeting, create_followup) via `useCreateTask`, sem persistência de execução
- `ai-command-orchestrator` — devolve `suggested_actions` com tipos: navigate, create_task, send_email, schedule_meeting, generate_report, create_followup, analyze_deeper, export_pdf
- `NextBestActionsPanel` — mostra NBAs com act/dismiss mas sem execução real (apenas marca status)
- `optimization_recommendations` — modelo similar com apply/dismiss
- `emitKernelEvent` / `kernel-ingest-event` — padrão consolidado
- `useCreateTask` — mutation existente para criação de tarefas
- Nenhuma tabela `action_executions` existe ainda

**O que falta:**
1. `action_executions` — tabela de registo e estado de execuções
2. `action_execution_settings` — config auto-execução por workspace
3. `action_approvals` — aprovação humana para ações sensíveis
4. Edge function `process-action-execution` — motor de execução
5. Refactor de `CommandQuickActions` para usar execuções persistidas
6. Integração NBA → execução
7. UI de histórico de execuções
8. Kernel events de lifecycle

---

### Migration SQL (1 migration)

**`action_executions`:**
- `id` UUID PK, `workspace_id`, `source_type` TEXT (command_center, next_best_action, optimization_recommendation, manual, automation), `source_id` TEXT nullable
- `action_type` TEXT, `title` TEXT, `description` TEXT nullable, `payload_json` JSONB DEFAULT '{}'
- `result_json` JSONB nullable, `entity_type` TEXT nullable, `entity_id` UUID nullable
- `created_by` UUID nullable, `execution_mode` TEXT DEFAULT 'manual' (manual, assisted, auto)
- `status` TEXT DEFAULT 'pending' (pending, processing, completed, failed, cancelled, skipped)
- `executed_at` TIMESTAMPTZ, `failed_at` TIMESTAMPTZ, `cancelled_at` TIMESTAMPTZ, `error_message` TEXT
- `correlation_id` TEXT, `created_at`, `updated_at`
- Index on `(workspace_id, status)`, `(correlation_id)`

**`action_execution_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `auto_execution_enabled` BOOLEAN DEFAULT false
- `allow_auto_task_creation` BOOLEAN DEFAULT false, `allow_auto_sequence_enrollment` BOOLEAN DEFAULT false
- `allow_auto_recovery_trigger` BOOLEAN DEFAULT false, `require_human_approval_for_email` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

**`action_approvals`:**
- `id` UUID PK, `workspace_id`, `action_execution_id` UUID FK
- `approval_status` TEXT DEFAULT 'pending' (pending, approved, rejected)
- `requested_by` UUID, `approved_by` UUID nullable
- `approved_at` TIMESTAMPTZ, `rejected_at` TIMESTAMPTZ, `notes` TEXT
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (5)

#### 1. `supabase/functions/process-action-execution/index.ts`
Edge function que:
1. Recebe `{ workspace_id, action_execution_id }` ou `{ workspace_id, action_type, payload, source_type, source_id, entity_type, entity_id, execution_mode, correlation_id }`
2. Se não existir execution, cria em `action_executions` com status `pending`
3. Marca status `processing`
4. Resolve handler por `action_type`:
   - `create_task` → insert em `tasks`
   - `create_followup_note` → insert em `tasks` com due_at +3 dias
   - `enroll_in_sequence` → insert em `email_sequence_enrollments`
   - `mark_recommendation_acted` → update `optimization_recommendations` ou `next_best_actions`
   - `trigger_abandoned_cart_recovery` → invoke `process-store-recovery`
   - `send_email` → requer aprovação se `require_human_approval_for_email`
   - `schedule_meeting` → cria task tipo meeting
   - `navigate_entity`, `generate_report` → marca completed (ação client-side)
5. Grava `result_json`, marca `completed` ou `failed`
6. Emite kernel event `ACTION.COMPLETED` / `ACTION.FAILED`
7. Idempotência via `correlation_id` — não executa se já existe completed com mesmo correlation_id

#### 2. `src/hooks/useActionExecution.ts`
- `useExecuteAction()` — mutation: cria execution + invoca edge function
- `useActionExecutions(filters?)` — lista execuções com status/type filters
- `useActionExecutionSettings()` — read/upsert settings
- `useActionApprovals()` — lista aprovações pendentes
- `useApproveAction()` / `useRejectAction()` — mutations de aprovação
- `useActionStats()` — KPIs: pending, completed today, failed, approvals pending

#### 3. `src/pages/ActionExecutionsPage.tsx`
Dashboard em `/dashboard/actions`:
- KPIs: pendentes, executadas hoje, falhadas, aprovações pendentes, taxa de execução
- Tabela de execuções com filtros (status, source_type, action_type)
- Cada linha: título, tipo, status badge, source, entity, timestamp, botão detalhe
- Tab de aprovações pendentes
- Settings panel inline

#### 4. `src/components/actions/ActionExecutionDetail.tsx`
Modal/drawer:
- Inputs (payload_json formatado), output (result_json), erro se falhou
- Origem (command_center / NBA / optimization), entidade afetada
- Modo (manual/auto), estado de aprovação se aplicável
- Timeline de eventos

#### 5. `src/components/actions/QuickActionButton.tsx`
Componente reutilizável para executar ações a partir de qualquer contexto:
- Recebe `actionType`, `payload`, `entityType`, `entityId`, `sourceType`
- Usa `useExecuteAction()` internamente
- Mostra loading/success/error inline
- Reutilizado em CommandQuickActions, NextBestActionsPanel, e entity pages

---

### Ficheiros a alterar (3)

#### 6. `src/components/command-center-v2/CommandQuickActions.tsx`
- Refactor: cada ação usa `useExecuteAction()` em vez de lógica inline
- Mantém mesma UI mas persiste execução em `action_executions`
- Ações sensíveis (send_email) criam approval request
- Status visual reflete estado real da execução

#### 7. `src/components/context-os/NextBestActionsPanel.tsx`
- Botão "Agir" passa a criar `action_execution` com `source_type: 'next_best_action'`
- Após execução bem-sucedida, marca NBA como `acted`
- Fecha ciclo: recomendação → execução → resultado

#### 8. `src/routes/AIRoutes.tsx`
- Adicionar rota: `/dashboard/actions` → `ActionExecutionsPage`

---

### Fluxo

```text
Origem (Command Center / NBA / Optimization / Manual)
  │
  ├─ UI dispara useExecuteAction()
  │   ├─ Cria action_executions (status: pending)
  │   └─ Invoca process-action-execution
  │
  └─ process-action-execution
       │
       ├─ Resolve handler por action_type
       ├─ Verifica se requer aprovação
       │   ├─ Sim → cria action_approvals, emite ACTION.APPROVAL_REQUESTED
       │   └─ Não → executa handler
       │
       ├─ Executa (create_task, enroll_sequence, etc.)
       ├─ Grava result_json, status = completed/failed
       └─ Emite ACTION.COMPLETED / ACTION.FAILED

ActionExecutionsPage (UI)
  │
  ├─ Lista execuções + filtros
  ├─ Aprovações pendentes
  ├─ Detalhe de execução
  └─ Settings de auto-execução
```

### Eventos Kernel
- `ACTION.CREATED`, `ACTION.STARTED`, `ACTION.COMPLETED`, `ACTION.FAILED`, `ACTION.CANCELLED`
- `ACTION.APPROVAL_REQUESTED`, `ACTION.APPROVED`, `ACTION.REJECTED`

### Compatibilidade
- `CommandQuickActions` mantém mesma UI — refactor interno para persistência
- `NextBestActionsPanel` ganha execução real sem redesign
- `useCreateTask` reutilizado dentro dos handlers
- Nenhum sistema paralelo — execução é camada transversal

