

## Enterprise Control Tower — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada (read-only):**
- `workspace_operating_state` — health scores (via `useWorkspaceEngine`)
- `executive_snapshots` / `executive_decision_packs` — Board Mode
- `portfolio_metrics` / `portfolio_recommendations` — Portfolio
- `operating_ledger_chains` — Ledger causal
- `business_objectives` — Objectives
- `kernel_events` / `kernel_decisions` / `kernel_actions` — Kernel EDA
- `forecast_runs` — Forecast
- `strategic_state_snapshots` / `strategic_recommendations` — Strategy
- `emitKernelEvent` — event bus

**O que falta:** `control_tower_state`, `control_tower_settings`, intervention engine, Control Tower UI.

**Decisão arquitectural:** A Control Tower é uma camada de orquestração e visualização. Não duplica lógica — agrega leituras de tabelas existentes e calcula um estado consolidado.

---

### Migration SQL (1 migration, 2 tabelas)

**`control_tower_state`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL UNIQUE
- `overall_status` TEXT DEFAULT 'stable' (stable, watch, risk, critical)
- `focus_priority` TEXT, `revenue_risk` INT DEFAULT 0, `execution_risk` INT DEFAULT 0
- `context_risk` INT DEFAULT 0, `forecast_risk` INT DEFAULT 0
- `open_critical_items` INT DEFAULT 0, `open_interventions` INT DEFAULT 0
- `active_missions` INT DEFAULT 0, `active_agents` INT DEFAULT 0, `overdue_tasks` INT DEFAULT 0
- `interventions_json` JSONB DEFAULT '[]'
- `updated_at` TIMESTAMPTZ DEFAULT now()

**`control_tower_settings`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `default_mode` TEXT DEFAULT 'executive' (executive, operations, causality)
- `auto_refresh_seconds` INT DEFAULT 60
- `show_executive_first` BOOLEAN DEFAULT true
- `enable_intervention_queue` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (3)

#### 1. `supabase/functions/process-control-tower/index.ts`
Edge function que:
1. Recebe `{ workspace_id }`
2. Agrega sinais de 8+ tabelas existentes (read-only):
   - `workspace_operating_state` → execution/context health
   - `executive_snapshots` → strategic health, risk level
   - `business_objectives` → at-risk count
   - `kernel_actions` → failed/queued count
   - `operating_ledger_chains` → failed chains
   - `portfolio_recommendations` → pending count
   - `executive_decision_packs` → open decisions
   - `forecast_runs` → gap vs target
3. Calcula `overall_status` (stable/watch/risk/critical) baseado em thresholds
4. Gera intervenções (array JSONB) com tipo, título, urgência, rationale
5. Upsert `control_tower_state`
6. Emite `CONTROL_TOWER.STATE_UPDATED`

#### 2. `src/hooks/useControlTower.ts`
- `useControlTowerState()` — estado actual com realtime subscription
- `useControlTowerSettings()` — read/upsert settings
- `useRefreshControlTower()` — invoca edge function
- `useControlTowerInterventions()` — interventions_json parsed

#### 3. `src/pages/ControlTowerPage.tsx`
Rota: `/dashboard/control-tower`

**Layout por modo (toggle no topo):**

**Executive Mode:**
- Status global badge (stable/watch/risk/critical)
- Focus priority
- Revenue/Execution/Context/Forecast risk gauges (4 mini cards)
- Intervenções recomendadas (queue com urgency badges + botões agir)
- Open executive decisions count

**Operations Mode:**
- Active missions + overdue tasks
- Active agents
- Failed actions count
- Recent kernel events timeline (reutiliza `useKernelEvents`)
- Quick actions: criar task, lançar action, abrir command

**Causality Mode:**
- Top causal chains (reutiliza `useLedgerChains`)
- Failed chains
- Outcome value total

**Componentes inline** (não ficheiros separados — dentro do page):
- StatusBadge, RiskGauge, InterventionCard, ModeToggle

**Settings panel** (collapsible): default_mode, auto_refresh, intervention queue toggle

Botão "Atualizar Control Tower"

---

### Ficheiro a alterar (1)

#### 4. `src/routes/AIRoutes.tsx`
- Adicionar lazy import `ControlTowerPage` + rota `/dashboard/control-tower`

---

### Fluxo

```text
process-control-tower (manual ou periódico)
  │
  ├─ Lê workspace_operating_state, executive_snapshots,
  │   business_objectives, kernel_actions, ledger_chains,
  │   portfolio_recommendations, forecast_runs
  ├─ Calcula overall_status + risk scores
  ├─ Gera interventions_json
  ├─ Upsert control_tower_state
  └─ Emite CONTROL_TOWER.STATE_UPDATED

ControlTowerPage (UI)
  │
  ├─ Mode toggle: Executive / Operations / Causality
  ├─ Estado global + risk gauges
  ├─ Intervention queue
  ├─ Operations timeline + quick actions
  ├─ Causality drill-down (via ledger)
  └─ Settings
```

### Compatibilidade
- Consome todas as tabelas existentes como read-only
- Reutiliza hooks existentes (`useKernelEvents`, `useLedgerChains`)
- Reutiliza `emitKernelEvent` para tracking
- Não altera nenhuma tabela existente

