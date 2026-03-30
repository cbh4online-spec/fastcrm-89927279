

## Autonomous Workspace Engine — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `system_metrics_daily` + `useSystemMetrics` — health score básico já calculado
- `action_executions` + `process-action-execution` — motor de execução completo
- `business_objectives` + `objective_plans` — objetivos com planos e progresso
- `kernel_events` + `emitKernelEvent` — barramento de eventos consolidado
- `agent_work_items` + `agent_handoffs` — orquestração multi-agente
- `next_best_actions` + `optimization_recommendations` — sinais operacionais
- `ContextOSHub` — hub estratégico com context score
- `AIRoutes.tsx` — roteamento centralizado

**Nada disto existe ainda:**
- `workspace_operating_state` — estado consolidado do workspace
- `workspace_missions` — unidades operacionais transversais
- `mission_links` — ligação missão → execução
- `workspace_alerts` — alertas operacionais
- `workspace_engine_settings` — configuração do motor
- Signal aggregator + health engine
- Mission generator + executor
- Workspace Ops UI + Executive Brief

---

### Migration SQL (1 migration, 5 tabelas)

**`workspace_operating_state`:**
- `id` UUID PK, `workspace_id` UUID UNIQUE NOT NULL
- `health_score` INT DEFAULT 50, `revenue_health` INT DEFAULT 50, `pipeline_health` INT DEFAULT 50
- `execution_health` INT DEFAULT 50, `response_health` INT DEFAULT 50, `context_health` INT DEFAULT 50, `automation_health` INT DEFAULT 50
- `risk_level` TEXT DEFAULT 'medium' (low/medium/high/critical)
- `primary_focus` TEXT, `active_missions_count` INT DEFAULT 0, `blockers_count` INT DEFAULT 0
- `last_recalculated_at` TIMESTAMPTZ, `created_at`, `updated_at`

**`workspace_missions`:**
- `id` UUID PK, `workspace_id`, `title` TEXT NOT NULL, `description` TEXT
- `mission_type` TEXT NOT NULL (recover_revenue, unblock_pipeline, reduce_execution_backlog, escalate_human_attention, refresh_context, stabilize_automation, improve_response_time, close_high_value_opportunity)
- `status` TEXT DEFAULT 'pending' (pending, active, completed, cancelled)
- `priority` TEXT DEFAULT 'medium', `impact_estimate` NUMERIC(12,2)
- `urgency` TEXT DEFAULT 'normal' (low, normal, high, critical)
- `owner_type` TEXT, `owner_id` UUID, `source_type` TEXT, `source_id` TEXT
- `created_at`, `updated_at`, `started_at` TIMESTAMPTZ, `completed_at` TIMESTAMPTZ

**`mission_links`:**
- `id` UUID PK, `workspace_id`, `mission_id` UUID FK
- `linked_type` TEXT NOT NULL (task, action_execution, objective, next_best_action, bot, handoff, contact, opportunity, cart)
- `linked_id` UUID NOT NULL, `created_at`

**`workspace_alerts`:**
- `id` UUID PK, `workspace_id`
- `alert_type` TEXT NOT NULL (execution_backlog, revenue_drop, no_response_risk, high_value_stall, automation_failure, context_stale, human_attention_required)
- `severity` TEXT DEFAULT 'medium' (low, medium, high, critical)
- `title` TEXT, `description` TEXT, `status` TEXT DEFAULT 'open' (open, acknowledged, resolved)
- `related_type` TEXT, `related_id` UUID
- `created_at`, `updated_at`, `resolved_at` TIMESTAMPTZ

**`workspace_engine_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `auto_mission_generation` BOOLEAN DEFAULT false, `auto_escalation_enabled` BOOLEAN DEFAULT true
- `auto_brief_enabled` BOOLEAN DEFAULT true, `refresh_interval_minutes` INT DEFAULT 60
- `risk_alert_threshold` TEXT DEFAULT 'high'
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (5)

#### 1. `supabase/functions/process-workspace-engine/index.ts`
Edge function central que:
1. Agrega sinais: query `action_executions` (pending/failed counts), `business_objectives` (at_risk count), `next_best_actions` (open count), `agent_work_items` (pending/failed), `tasks` (overdue), context drift score
2. Calcula health sub-scores (revenue, pipeline, execution, response, context, automation) — cada 0-100
3. Calcula `health_score` global (média ponderada)
4. Classifica `risk_level` baseado no score global
5. Upsert em `workspace_operating_state`
6. Detecta condições de alerta → insere em `workspace_alerts`
7. Se `auto_mission_generation` activo: identifica missões prioritárias baseadas nos sinais (ex: execution_backlog alto → missão `reduce_execution_backlog`), evita duplicados por mission_type+status
8. Emite kernel events: `WORKSPACE.STATE_RECALCULATED`, `WORKSPACE.ALERT_CREATED`, `WORKSPACE.MISSION_CREATED`

#### 2. `supabase/functions/process-workspace-missions/index.ts`
Edge function que:
1. Recebe `{ workspace_id, mission_id }` — processa missão específica
2. Lê missão + sinais do workspace
3. Baseado no `mission_type`, cria `action_executions` e `mission_links` (ex: `reduce_execution_backlog` → retry failed actions; `recover_revenue` → create recovery tasks)
4. Atualiza missão para `active`
5. Emite `WORKSPACE.MISSION_CREATED` / `WORKSPACE.MISSION_COMPLETED`

#### 3. `src/hooks/useWorkspaceEngine.ts`
- `useWorkspaceState()` — query `workspace_operating_state` com realtime
- `useWorkspaceMissions(filters?)` — lista missões com status filter
- `useWorkspaceAlerts()` — lista alertas open/acknowledged
- `useWorkspaceEngineSettings()` — read/upsert settings
- `useRecalculateWorkspace()` — invoca `process-workspace-engine`
- `useExecuteMission()` — invoca `process-workspace-missions`
- `useResolveMission()` — marca missão completed
- `useResolveAlert()` — marca alerta resolved
- `useWorkspaceStats()` — KPIs: health, missions active, alerts open, blockers

#### 4. `src/pages/WorkspaceOpsPage.tsx`
Rota: `/dashboard/workspace-ops`
- Health score global (gauge/circle) + sub-scores (6 barras)
- Risk level badge
- Primary focus card
- Missões ativas (cards com título, tipo, priority, impact, botão executar/concluir)
- Alertas abertos (lista com severity badges, botão acknowledge/resolve)
- Blockers count + top blockers
- Ações críticas pendentes (últimas 5 action_executions failed)
- Botão "Recalcular Estado"
- Settings panel (toggles auto_mission, auto_escalation, refresh interval)

#### 5. `src/components/workspace-ops/WorkspaceExecutiveBrief.tsx`
Componente integrado na WorkspaceOpsPage:
- Secção "A correr bem" — sub-scores >= 70
- Secção "Em risco" — sub-scores < 50
- Secção "Requer ação humana" — alertas severity high/critical
- Secção "Maior alavanca" — missão com maior impact_estimate
- Secção "Executado automaticamente" — action_executions completed today
- Secção "Bloqueado" — missions/alerts sem resolução > 48h

---

### Ficheiros a alterar (1)

#### 6. `src/routes/AIRoutes.tsx`
- Adicionar lazy import + rota: `/dashboard/workspace-ops` → `WorkspaceOpsPage`

---

### Fluxo

```text
process-workspace-engine (periódico ou manual)
  │
  ├─ Agrega sinais de todos os módulos
  ├─ Calcula health_score + sub-scores
  ├─ Upsert workspace_operating_state
  ├─ Detecta alertas → workspace_alerts
  ├─ Gera missões automáticas (se enabled)
  │   └─ workspace_missions (pending)
  └─ Emite WORKSPACE.STATE_RECALCULATED
  
process-workspace-missions (por missão)
  │
  ├─ Lê missão + contexto
  ├─ Cria action_executions + mission_links
  ├─ Marca missão active
  └─ Emite WORKSPACE.MISSION_CREATED

WorkspaceOpsPage (UI)
  │
  ├─ Health gauge + sub-scores
  ├─ Missões ativas
  ├─ Alertas
  ├─ Executive Brief
  └─ Settings
```

### Compatibilidade
- Reutiliza `action_executions` com `source_type: 'workspace_mission'`
- Reutiliza `kernel_events` para todos os eventos `WORKSPACE.*`
- Não altera nenhuma tabela existente
- Não duplica centros de controlo — vive em `/dashboard/workspace-ops` como vista operacional transversal
- Health engine agrega dados de tabelas existentes sem modificá-las

