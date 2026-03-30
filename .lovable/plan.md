

## Business Autopilot por Objetivos — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `action_executions` + `process-action-execution` — motor de execução com handlers (create_task, enroll_in_sequence, etc.)
- `next_best_actions` + `useNextBestActions` — recomendações priorizadas com act/dismiss
- `kernel_events` + `emitKernelEvent` — padrão de eventos consolidado
- `ContextOSHub` — hub estratégico com NextBestActionsPanel integrado
- `useCreateTask` — mutation para criação de tarefas
- `optimization_recommendations` — modelo de recomendações similar
- `AIRoutes.tsx` — roteamento centralizado para módulos AI/ops

**O que será criado:**
1. 4 tabelas: `business_objectives`, `objective_metrics`, `objective_plans`, `objective_action_links`, `objective_settings`
2. 3 edge functions: `generate-objective-plan`, `process-objective-plan`, `recalculate-objective-progress`
3. 1 hook: `useBusinessObjectives.ts`
4. 2 componentes UI: `ObjectiveCenterPage.tsx`, `ObjectiveDetail.tsx`
5. 1 rota: `/dashboard/objectives`

---

### Migration SQL (1 migration, 5 tabelas)

**`business_objectives`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL, `title` TEXT NOT NULL, `description` TEXT
- `objective_type` TEXT NOT NULL (recover_revenue, generate_meetings, increase_pipeline_value, improve_conversion_rate, reduce_renewal_risk, recover_abandoned_carts, increase_store_revenue, reactivate_silent_leads)
- `status` TEXT DEFAULT 'draft' (draft, active, at_risk, on_track, completed, paused, cancelled)
- `target_value` NUMERIC(12,2), `current_value` NUMERIC(12,2) DEFAULT 0, `unit` TEXT DEFAULT '€'
- `period_start` DATE, `period_end` DATE
- `owner_user_id` UUID, `priority` TEXT DEFAULT 'medium' (low, medium, high, critical)
- `auto_plan_enabled` BOOLEAN DEFAULT false, `auto_execute_enabled` BOOLEAN DEFAULT false
- `created_at`, `updated_at`, `completed_at` TIMESTAMPTZ
- Index: `(workspace_id, status)`

**`objective_metrics`:**
- `id` UUID PK, `workspace_id`, `objective_id` UUID FK → business_objectives
- `metric_key` TEXT, `metric_label` TEXT, `current_value` NUMERIC(12,2) DEFAULT 0, `target_value` NUMERIC(12,2)
- `unit` TEXT, `progress_percent` INT DEFAULT 0, `last_calculated_at` TIMESTAMPTZ
- `created_at`, `updated_at`

**`objective_plans`:**
- `id` UUID PK, `workspace_id`, `objective_id` UUID FK
- `title` TEXT, `plan_json` JSONB DEFAULT '{}', `status` TEXT DEFAULT 'draft' (draft, active, completed, superseded)
- `generated_by` TEXT DEFAULT 'ai', `created_at`, `updated_at`

**`objective_action_links`:**
- `id` UUID PK, `workspace_id`, `objective_id` UUID FK
- `action_execution_id` UUID, `task_id` UUID, `next_best_action_id` UUID, `sequence_enrollment_id` UUID
- `attributed_value` NUMERIC(12,2) DEFAULT 0, `created_at`

**`objective_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false, `max_daily_actions_per_objective` INT DEFAULT 10
- `auto_plan_enabled` BOOLEAN DEFAULT false, `auto_replan_enabled` BOOLEAN DEFAULT false
- `auto_execute_enabled` BOOLEAN DEFAULT false, `alert_when_at_risk` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (6)

#### 1. `supabase/functions/generate-objective-plan/index.ts`
- Recebe `{ workspace_id, objective_id }`
- Lê objetivo + métricas atuais + NBAs abertas + context score
- Usa Gemini Flash para gerar plano com: initiatives, action_groups, expected_impact, timeline
- Insere em `objective_plans`
- Emite `OBJECTIVE.PLAN_GENERATED` via kernel

#### 2. `supabase/functions/process-objective-plan/index.ts`
- Recebe `{ workspace_id, objective_id }`
- Lê plano ativo → extrai ações
- Cria `action_executions` (via insert direto, source_type: 'objective') + `objective_action_links`
- Distribui ações ao longo do período (max_daily_actions_per_objective)
- Evita duplicados por correlation_id = `obj_{objective_id}_{action_type}_{entity_id}`
- Emite `OBJECTIVE.ACTION_LINKED`

#### 3. `supabase/functions/recalculate-objective-progress/index.ts`
- Recebe `{ workspace_id }` ou `{ workspace_id, objective_id }`
- Para cada objetivo ativo: query `objective_action_links` → sum `attributed_value`
- Atualiza `current_value` em `business_objectives`
- Atualiza `progress_percent` em `objective_metrics`
- Calcula trajetória: se progresso < (dias_passados / total_dias × target) → marca `at_risk`
- Se progresso >= trajetória → marca `on_track`
- Se `current_value >= target_value` → marca `completed`
- Emite `OBJECTIVE.AT_RISK` / `OBJECTIVE.ON_TRACK` / `OBJECTIVE.COMPLETED`

#### 4. `src/hooks/useBusinessObjectives.ts`
- `useBusinessObjectives(filters?)` — lista com status filter + realtime
- `useObjectiveDetail(id)` — objetivo + metrics + plano + action_links
- `useCreateObjective()` — mutation insert
- `useUpdateObjective()` — mutation update (pause, cancel, complete)
- `useGeneratePlan(objectiveId)` — invoca `generate-objective-plan`
- `useExecutePlan(objectiveId)` — invoca `process-objective-plan`
- `useRecalculateProgress()` — invoca `recalculate-objective-progress`
- `useObjectiveSettings()` — read/upsert settings
- `useObjectiveStats()` — KPIs: ativos, at_risk, receita em progresso, ações geradas

#### 5. `src/pages/ObjectiveCenterPage.tsx`
- Rota: `/dashboard/objectives`
- KPIs: objetivos ativos, em risco, receita em recuperação, taxa de execução
- Lista de objetivos com: título, tipo, target vs current, progress bar, status badge, owner
- Cada card: botões ver detalhe, gerar plano, pausar
- Formulário de criação inline (tipo, título, target, período, owner)
- Settings panel com toggles de auto-plan/auto-execute

#### 6. `src/components/objectives/ObjectiveDetail.tsx`
- Modal/drawer com:
  - Métricas (progress bars por metric_key)
  - Plano atual (initiatives formatadas do plan_json)
  - Ações ligadas (lista de action_links com status)
  - Tarefas geradas
  - Botões: gerar plano, executar plano, replanear, pausar, concluir
  - Timeline de kernel events filtrados por `OBJECTIVE.*`

---

### Ficheiros a alterar (1)

#### 7. `src/routes/AIRoutes.tsx`
- Adicionar lazy import + rota: `/dashboard/objectives` → `ObjectiveCenterPage`

---

### Fluxo

```text
Utilizador cria objetivo (ex: "Recuperar 5.000€ em 30 dias")
  │
  ├─ Emite OBJECTIVE.CREATED
  ├─ Gerar plano (generate-objective-plan)
  │   ├─ Lê métricas, NBAs, context
  │   ├─ IA gera initiatives + action_groups
  │   └─ Insere objective_plans
  │
  ├─ Executar plano (process-objective-plan)
  │   ├─ Cria action_executions (create_task, enroll_sequence, etc.)
  │   ├─ Cria objective_action_links
  │   └─ Distribui ao longo do período
  │
  └─ Recalcular progresso (recalculate-objective-progress)
      ├─ Soma attributed_value das ações
      ├─ Atualiza current_value e progress_percent
      ├─ Se desvio → marca at_risk, emite evento
      └─ Se completo → marca completed
```

### Compatibilidade
- `action_executions` reutilizado com `source_type: 'objective'`
- `objective_action_links` liga objetivos a ações existentes sem alterar nenhuma tabela
- Kernel events seguem padrão `emitKernelEvent` existente
- ContextOSHub não é alterado — objetivos vivem em página própria
- Não duplica sistema de tasks — usa `process-action-execution` para criar tarefas reais

