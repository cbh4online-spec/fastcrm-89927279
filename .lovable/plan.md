

## Capital Allocation & Portfolio Layer — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `business_context` — offers, pricing_model, average_ticket, revenue targets
- `forecast_runs` + `simulation_scenarios` — baseline e cenários
- `strategic_state_snapshots` + `strategic_recommendations` — foco e hipóteses
- `executive_snapshots` + `executive_decision_packs` — Board Mode
- `workspace_operating_state` — health scores operacionais
- `workspace_memories` — padrões históricos
- `emitKernelEvent` — barramento de eventos

**Nada disto existe ainda** — portfolio_entities, portfolio_metrics, portfolio_recommendations, portfolio_settings, allocation engine, Portfolio Center UI.

---

### Migration SQL (1 migration, 4 tabelas)

**`portfolio_entities`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `entity_type` TEXT NOT NULL (offer, product, channel, sequence, agent, mission, objective)
- `entity_id` TEXT NOT NULL, `name` TEXT NOT NULL, `category` TEXT
- `status` TEXT DEFAULT 'active' (active, paused, deprecated)
- `created_at`, `updated_at`
- Unique: `(workspace_id, entity_type, entity_id)`

**`portfolio_metrics`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `portfolio_entity_id` UUID FK → portfolio_entities
- `revenue_actual` NUMERIC DEFAULT 0, `revenue_forecast` NUMERIC DEFAULT 0
- `contribution_margin_estimate` NUMERIC DEFAULT 0, `conversion_rate` NUMERIC(5,4) DEFAULT 0
- `ltv_estimate` NUMERIC DEFAULT 0, `workload_cost_estimate` NUMERIC DEFAULT 0
- `automation_leverage_score` INT DEFAULT 50, `risk_score` INT DEFAULT 50
- `strategic_fit_score` INT DEFAULT 50, `capital_efficiency_score` INT DEFAULT 50
- `allocation_recommendation` TEXT DEFAULT 'maintain' (invest_more, maintain, optimize, deprioritize, pause, scale)
- `confidence` NUMERIC(3,2) DEFAULT 0.5
- `updated_at`

**`portfolio_recommendations`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `portfolio_entity_id` UUID FK → portfolio_entities (nullable)
- `recommendation_type` TEXT NOT NULL (increase_attention, increase_automation, shift_channel_mix, reduce_effort, pause_investment, reinforce_offer, promote_bundle, reassign_agent_capacity, simplify_sequence, focus_high_ltv_segment)
- `title` TEXT NOT NULL, `rationale` TEXT, `expected_impact` TEXT
- `confidence` NUMERIC(3,2) DEFAULT 0.5, `priority` TEXT DEFAULT 'medium'
- `status` TEXT DEFAULT 'pending' (pending, accepted, acted, dismissed, expired)
- `created_at`, `updated_at`, `acted_at` TIMESTAMPTZ

**`portfolio_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `risk_weight` NUMERIC(3,2) DEFAULT 0.15
- `revenue_weight` NUMERIC(3,2) DEFAULT 0.35
- `effort_weight` NUMERIC(3,2) DEFAULT 0.20
- `automation_weight` NUMERIC(3,2) DEFAULT 0.10
- `strategy_weight` NUMERIC(3,2) DEFAULT 0.20
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE/DELETE.

---

### Ficheiros a criar (3)

#### 1. `supabase/functions/process-portfolio-allocation/index.ts`
Edge function que:
1. Recebe `{ workspace_id }`
2. Recolhe sinais: `business_context` (offers, average_ticket, targets), `workspace_operating_state` (health), último `forecast_runs` (revenue forecast), `strategic_state_snapshots` (growth_mode, bottleneck), `strategic_recommendations` (pending)
3. Usa Gemini Flash com tool calling para:
   - Consolidar entidades no portfolio (offers de business_context, canais ativos, agentes)
   - Calcular capital_efficiency_score por entidade (receita, conversão, risco, esforço, automação, alinhamento estratégico)
   - Gerar allocation_recommendation por entidade (invest_more/maintain/optimize/deprioritize/pause/scale)
   - Gerar portfolio_recommendations acionáveis com rationale
4. Upsert `portfolio_entities` + `portfolio_metrics`
5. Insere `portfolio_recommendations` (expira pending > 14 dias)
6. Emite `PORTFOLIO.SNAPSHOT_UPDATED`, `PORTFOLIO.RECOMMENDATION_CREATED`

#### 2. `src/hooks/usePortfolioAllocation.ts`
- `usePortfolioEntities(typeFilter?)` — lista entidades com métricas
- `usePortfolioRecommendations(statusFilter?)` — lista recomendações
- `usePortfolioSettings()` — read/upsert settings
- `useRefreshPortfolio()` — invoca `process-portfolio-allocation`
- `useActOnPortfolioRecommendation()` — marca como acted/dismissed
- `usePortfolioTopAssets()` — top 5 por capital_efficiency_score
- `usePortfolioWeakest()` — bottom 5 por capital_efficiency_score

#### 3. `src/pages/PortfolioCenterPage.tsx`
Rota: `/dashboard/portfolio`
- **Top Assets**: top 5 entidades por capital efficiency com badge de allocation
- **Áreas a Cortar**: bottom 5 entidades com recomendação deprioritize/pause
- **Capital Efficiency Grid**: tabela com entity_type, name, revenue, conversion, risk, efficiency score, allocation badge
- **Alocação por Tipo**: breakdown por offer/channel/agent/sequence (mini cards agrupados)
- **Recomendações**: cards com título, rationale, expected_impact, priority, botões aceitar/dispensar
- **Foco Recomendado**: destaque da entidade com maior potencial de crescimento
- **Settings**: sliders para pesos (revenue, risk, effort, automation, strategy)
- Botão "Atualizar Portfolio"

---

### Ficheiros a alterar (1)

#### 4. `src/routes/AIRoutes.tsx`
- Adicionar lazy import `PortfolioCenterPage` + rota `/dashboard/portfolio`

---

### Fluxo

```text
process-portfolio-allocation (manual ou periódico)
  │
  ├─ Recolhe sinais (context, offers, health, forecast, strategy)
  ├─ Gemini Flash → eficiência + alocação por entidade
  ├─ Upsert portfolio_entities + portfolio_metrics
  ├─ Gera portfolio_recommendations
  ├─ Expira recomendações antigas
  └─ Emite PORTFOLIO.* events

PortfolioCenterPage (UI)
  │
  ├─ Top assets + áreas a cortar
  ├─ Capital efficiency grid
  ├─ Alocação por tipo
  ├─ Recomendações (aceitar/dispensar)
  ├─ Foco recomendado
  └─ Settings (pesos)
```

### Compatibilidade
- Consome `business_context`, `forecast_runs`, `strategic_state_snapshots` como read-only
- Reutiliza `emitKernelEvent` para eventos `PORTFOLIO.*`
- Board Mode pode consumir `portfolio_metrics` e `portfolio_recommendations` para enriquecer executive view
- Strategy Layer pode converter `portfolio_recommendations` em objectives/missions
- Não altera nenhuma tabela existente

