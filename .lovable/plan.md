

## Autonomous Strategy Layer — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `business_context` — metas, ICP, ticket médio, ciclo de venda, SLA
- `workspace_operating_state` — health scores por área
- `workspace_memories` — padrões históricos de sucesso/falha
- `business_objectives` + `objective_plans` — objetivos com planos e progresso
- `workspace_missions` — unidades operacionais transversais
- `forecast_runs` + `simulation_scenarios` — previsões e cenários
- `kernel_events` + `emitKernelEvent` — barramento de eventos
- `action_executions` — motor de execução
- `process-workspace-engine` — agregação de sinais operacionais

**Nada disto existe ainda:**
- `strategic_state_snapshots` — fotografias estratégicas do workspace
- `strategic_hypotheses` — hipóteses de reposicionamento
- `strategic_recommendations` — recomendações acionáveis
- `strategic_recommendation_links` — ligação a objectives/missions
- `strategy_settings` — configuração
- Strategy Engine (edge function)
- Strategy Center UI

---

### Migration SQL (1 migration, 5 tabelas)

**`strategic_state_snapshots`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `strategic_focus` TEXT, `strategic_health_score` INT DEFAULT 50
- `growth_mode` TEXT DEFAULT 'stabilization' (acquisition, conversion, retention, recovery, stabilization)
- `bottleneck_type` TEXT (lead_generation, follow_up, conversion, delivery, context_gap, execution_overload, retention_risk)
- `primary_constraint` TEXT, `main_revenue_driver` TEXT, `main_revenue_risk` TEXT
- `execution_alignment_score` INT DEFAULT 50, `context_alignment_score` INT DEFAULT 50
- `diagnosis_summary` TEXT, `confidence` NUMERIC(3,2) DEFAULT 0.5
- `top_constraints` JSONB DEFAULT '[]', `top_leverage_points` JSONB DEFAULT '[]'
- `created_at`
- Index: `(workspace_id, created_at DESC)`

**`strategic_hypotheses`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `title` TEXT NOT NULL, `description` TEXT, `rationale` TEXT
- `hypothesis_type` TEXT NOT NULL (increase_follow_up_intensity, shorten_sales_cycle, focus_high_ticket_offers, improve_recovery_engine, rebalance_agent_capacity, improve_context_quality, shift_channel_mix, reduce_execution_noise, strengthen_retention_motion)
- `expected_impact` TEXT, `confidence` NUMERIC(3,2) DEFAULT 0.5
- `status` TEXT DEFAULT 'active' (active, validated, invalidated, expired)
- `created_at`, `updated_at`, `validated_at` TIMESTAMPTZ

**`strategic_recommendations`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `title` TEXT NOT NULL, `description` TEXT, `rationale` TEXT
- `recommendation_type` TEXT NOT NULL, `expected_impact` TEXT
- `confidence` NUMERIC(3,2) DEFAULT 0.5, `priority` TEXT DEFAULT 'medium'
- `status` TEXT DEFAULT 'pending' (pending, accepted, acted, dismissed, expired)
- `linked_hypothesis_id` UUID FK → strategic_hypotheses (nullable)
- `created_at`, `updated_at`, `acted_at` TIMESTAMPTZ

**`strategic_recommendation_links`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `recommendation_id` UUID FK → strategic_recommendations
- `objective_id` UUID FK → business_objectives (nullable)
- `mission_id` UUID FK → workspace_missions (nullable)
- `created_at`

**`strategy_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `auto_strategy_refresh` BOOLEAN DEFAULT false
- `confidence_threshold` NUMERIC(3,2) DEFAULT 0.3
- `allow_auto_objective_creation` BOOLEAN DEFAULT false
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (4)

#### 1. `supabase/functions/process-strategy-layer/index.ts`
Edge function central que:
1. Recebe `{ workspace_id }`
2. Recolhe sinais: `business_context` (metas, ticket, SLA), `workspace_operating_state` (health scores), últimos `forecast_runs` (baseline), `business_objectives` (progress/at_risk), `workspace_memories` (top patterns), `workspace_missions` (backlog)
3. Usa Gemini Flash para diagnosticar: growth_mode, bottleneck_type, primary_constraint, top_constraints, top_leverage_points, strategic_focus
4. Gera hipóteses baseadas nos gargalos (ex: execution_overload → `reduce_execution_noise`)
5. Gera recomendações acionáveis com rationale e expected_impact
6. Insere `strategic_state_snapshots`, cria/atualiza `strategic_hypotheses`, cria `strategic_recommendations` (expira as antigas pending > 14 dias)
7. Emite `STRATEGY.SNAPSHOT_CREATED`, `STRATEGY.HYPOTHESIS_CREATED`, `STRATEGY.RECOMMENDATION_CREATED`

#### 2. `src/hooks/useStrategyLayer.ts`
- `useStrategicState()` — último snapshot com query
- `useStrategicHypotheses(statusFilter?)` — lista hipóteses
- `useStrategicRecommendations(statusFilter?)` — lista recomendações
- `useStrategySettings()` — read/upsert settings
- `useRefreshStrategy()` — invoca `process-strategy-layer`
- `useActOnRecommendation()` — marca recommendation como acted + opcionalmente cria objective/mission via `strategic_recommendation_links`
- `useDismissRecommendation()` — marca dismissed
- `useStrategyHistory()` — últimos N snapshots para ver evolução

#### 3. `src/pages/StrategyCenterPage.tsx`
Rota: `/dashboard/strategy`
- **Estado Estratégico**: growth_mode badge, strategic_health_score gauge, bottleneck_type, strategic_focus
- **Diagnóstico**: primary_constraint, top_constraints, top_leverage_points, confidence
- **Hipóteses Ativas**: cards com título, rationale, type badge, confidence, status
- **Recomendações**: cards com título, description, rationale, priority, expected_impact, botões "Aceitar" / "Converter em Objetivo" / "Dispensar"
- **Executive Brief**: componente `StrategyExecutiveBrief` integrado
- **Histórico**: últimos 10 snapshots com evolução de growth_mode e health_score
- **Settings**: toggles auto_refresh, confidence_threshold, auto_objective_creation
- Botão "Atualizar Estratégia"

#### 4. `src/components/strategy/StrategyExecutiveBrief.tsx`
Componente que mostra:
- "O que trava crescimento" — primary_constraint + bottleneck_type
- "Maior alavanca" — top_leverage_points[0]
- "Foco recomendado" — strategic_focus + growth_mode
- "Objetivos a criar/ajustar" — recomendações pending com alta prioridade
- "Áreas desalinhadas" — sub-scores da workspace_operating_state abaixo de 50
- "Confiança estratégica" — confidence penalizada se context_alignment_score baixo

---

### Ficheiros a alterar (1)

#### 5. `src/routes/AIRoutes.tsx`
- Adicionar lazy import `StrategyCenterPage` + rota `/dashboard/strategy`

---

### Fluxo

```text
process-strategy-layer (manual ou periódico)
  │
  ├─ Recolhe sinais (context, health, forecast, objectives, memory)
  ├─ Gemini Flash → diagnóstico estratégico
  ├─ Gera hipóteses por bottleneck
  ├─ Gera recomendações acionáveis
  ├─ Insere strategic_state_snapshots
  ├─ Expira recomendações antigas
  └─ Emite STRATEGY.* events

StrategyCenterPage (UI)
  │
  ├─ Estado estratégico (gauge + badges)
  ├─ Diagnóstico (constraints + leverage)
  ├─ Hipóteses ativas
  ├─ Recomendações → converter em Objective/Mission
  ├─ Executive Brief
  ├─ Histórico de snapshots
  └─ Settings
```

### Compatibilidade
- Reutiliza `business_context` e `workspace_operating_state` como inputs — sem alterar
- Reutiliza `business_objectives` e `workspace_missions` como destinos de recomendações
- Reutiliza `workspace_memories` para evitar repetir estratégias falhadas
- Reutiliza `forecast_runs` para fundamentar impacto esperado
- Reutiliza `emitKernelEvent` para eventos `STRATEGY.*`
- Não duplica centros de controlo — vive em `/dashboard/strategy`
- Não altera nenhuma tabela existente

