

## Enterprise Simulation & Forecast Layer — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `revenue_forecasts` + `compute-revenue-forecast` — forecast de receita com best/expected/worst case
- `revenue_scenarios` + `run-revenue-scenario` — cenários what-if já funcionais (deals, conversão, reativação)
- `revenue_forecast_snapshots` + `revenue_targets` — snapshots de pipeline e metas
- `deal_probability_scores` — scoring probabilístico por deal
- `demand_forecast` — forecast de procura por produto
- `RFCScenariosPage` — UI de simulação com sliders e presets
- `business_context` — metas mensais/trimestrais/anuais, average_ticket, sales_cycle_days
- `workspace_operating_state` — health scores por área
- `workspace_memories` — padrões históricos reutilizáveis
- `kernel_events` + `emitKernelEvent` — barramento de eventos

**O que já existe vs o que falta:**
- Já existe cenário what-if revenue-focused → falta cenários operacionais (follow-up, canal, agentes, backlog)
- Já existe forecast de receita → falta forecast de pipeline coverage, execution capacity, risk_of_miss
- Já existe `revenue_scenarios` → falta modelo genérico `simulation_scenarios` com comparação lado a lado
- Falta `forecast_models`, `forecast_runs`, `forecast_settings` como schema formal
- Falta Forecast Center UI unificada
- Falta integração com Workspace Ops e Objectives

---

### Migration SQL (1 migration, 4 tabelas)

**`forecast_models`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `model_type` TEXT NOT NULL (baseline, trend, target_gap)
- `name` TEXT NOT NULL, `description` TEXT
- `config_json` JSONB DEFAULT '{}'
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

**`forecast_runs`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `model_id` UUID FK → forecast_models (nullable)
- `scenario_id` UUID (nullable), `run_type` TEXT DEFAULT 'baseline'
- `input_snapshot_json` JSONB DEFAULT '{}', `output_snapshot_json` JSONB DEFAULT '{}'
- `assumptions_json` JSONB DEFAULT '[]'
- `confidence` NUMERIC(3,2) DEFAULT 0.5
- `created_at`

**`simulation_scenarios`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `title` TEXT NOT NULL, `description` TEXT
- `scenario_type` TEXT NOT NULL (follow_up_boost, channel_switch, sla_reduction, recovery_boost, agent_swap, auto_execution, backlog_reduction, meeting_boost, custom)
- `status` TEXT DEFAULT 'draft' (draft, simulated, applied, archived)
- `inputs_json` JSONB DEFAULT '{}', `outputs_json` JSONB DEFAULT '{}'
- `delta_json` JSONB DEFAULT '{}'
- `assumptions` JSONB DEFAULT '[]'
- `confidence` NUMERIC(3,2) DEFAULT 0.5
- `created_by` UUID, `created_at`, `updated_at`

**`forecast_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `default_horizon_days` INT DEFAULT 30
- `default_model_type` TEXT DEFAULT 'baseline'
- `confidence_threshold` NUMERIC(3,2) DEFAULT 0.3
- `allow_memory_boost` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (4)

#### 1. `supabase/functions/run-forecast-simulation/index.ts`
Edge function central que:
1. Recebe `{ workspace_id, scenario_type?, inputs? }` 
2. Recolhe sinais: business_context (metas, average_ticket, sales_cycle_days), pipeline atual (opportunities count/value by stage), action_executions (throughput), agent_work_items (backlog), workspace_operating_state (health scores)
3. Calcula baseline forecast: `forecast_revenue_30d/90d`, `forecast_deals_30d`, `pipeline_coverage`, `execution_capacity_score`, `risk_of_miss_target`
4. Se `scenario_type` presente, aplica modificadores operacionais (ex: `follow_up_boost` → +15% conversion, `recovery_boost` → +X€ recovered, `backlog_reduction` → +20% execution capacity)
5. Calcula deltas vs baseline
6. Persiste em `forecast_runs` + `simulation_scenarios`
7. Emite `FORECAST.RUN_CREATED` / `FORECAST.SCENARIO_CREATED`
8. Devolve output com assumptions explícitas

#### 2. `src/hooks/useForecastSimulation.ts`
- `useBaselineForecast()` — último forecast_run tipo baseline
- `useSimulationScenarios(filters?)` — lista cenários com status filter
- `useRunSimulation()` — invoca `run-forecast-simulation`
- `useForecastSettings()` — read/upsert settings
- `useCompareScenarios(ids[])` — lê 2-3 cenários para comparação side-by-side
- `useForecastStats()` — KPIs: risk_of_miss, pipeline_coverage, execution_capacity

#### 3. `src/pages/ForecastCenterPage.tsx`
Rota: `/dashboard/forecast`
- **Baseline Panel**: forecast_revenue_30d/90d, pipeline_coverage, execution_capacity, risk_of_miss com gauge
- **Target Gap**: barra visual meta vs baseline vs best scenario
- **Scenario Builder**: dropdown scenario_type + sliders de inputs (intensidade 0-100%) + botão simular
- **Scenario Cards**: últimos cenários com delta revenue, delta deals, confidence, assumptions collapsible
- **Comparison View**: selecionar 2 cenários → tabela side-by-side (revenue, deals, conversion, workload, risk)
- **Assumptions Panel**: cada número mostra de onde vem e que variáveis foram usadas
- **Settings**: toggles + horizon + confidence threshold

#### 4. `src/components/forecast/ScenarioComparisonTable.tsx`
Componente reutilizável de comparação:
- Colunas: Baseline | Cenário A | Cenário B
- Linhas: Revenue 30d, Revenue 90d, Deals, Conversion Rate, Pipeline Coverage, Execution Capacity, Risk, Confidence
- Deltas coloridos (verde/vermelho)
- Badge de cenário recomendado (maior revenue delta + menor risk)

---

### Ficheiros a alterar (1)

#### 5. `src/routes/AIRoutes.tsx`
- Adicionar lazy import + rota: `/dashboard/forecast` → `ForecastCenterPage`

---

### Fluxo

```text
run-forecast-simulation (manual ou periódico)
  │
  ├─ Recolhe sinais (business_context, pipeline, executions, health)
  ├─ Calcula baseline forecast
  ├─ Se cenário: aplica modificadores operacionais
  ├─ Calcula deltas vs baseline
  ├─ Persiste forecast_runs + simulation_scenarios
  ├─ Emite FORECAST.* events
  └─ Devolve output + assumptions

ForecastCenterPage (UI)
  │
  ├─ Baseline forecast (gauge + KPIs)
  ├─ Target gap visual
  ├─ Scenario builder (tipo + sliders)
  ├─ Scenario cards com deltas
  ├─ Comparison table (side-by-side)
  └─ Settings
```

### Compatibilidade
- Coexiste com `revenue_scenarios` e `run-revenue-scenario` existentes (deal-level)
- Este layer é operacional (follow-up, agentes, backlog) vs o existente que é deal-level
- Reutiliza `business_context` para metas e `workspace_operating_state` para health inputs
- Reutiliza `emitKernelEvent` para eventos `FORECAST.*`
- Não altera tabelas existentes

