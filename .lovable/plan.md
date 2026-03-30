

## Board Mode / Investor Mode — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `strategic_state_snapshots` — growth_mode, bottleneck, health scores
- `strategic_recommendations` — recomendações acionáveis
- `forecast_runs` + `simulation_scenarios` — baseline e cenários
- `business_objectives` — progresso e risco por objetivo
- `workspace_operating_state` — health scores operacionais
- `workspace_memories` — padrões confirmados
- `business_context` — metas, ticket médio, SLA
- `emitKernelEvent` — barramento de eventos

**Nada disto existe ainda** — executive snapshots, decision packs, board/investor UI, executive brief generator.

---

### Migration SQL (1 migration, 3 tabelas)

**`executive_snapshots`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `snapshot_type` TEXT NOT NULL (board, investor, monthly_review, quarterly_review)
- `title` TEXT, `summary` TEXT
- `period_start` DATE, `period_end` DATE
- `revenue_actual` NUMERIC, `revenue_target` NUMERIC, `revenue_forecast` NUMERIC
- `pipeline_actual` NUMERIC, `pipeline_required` NUMERIC
- `execution_health` INT DEFAULT 50, `strategic_health` INT DEFAULT 50, `context_health` INT DEFAULT 50
- `risk_level` TEXT DEFAULT 'medium', `focus_priority` TEXT
- `key_decisions_json` JSONB DEFAULT '[]'
- `wins_json` JSONB DEFAULT '[]', `risks_json` JSONB DEFAULT '[]', `priorities_json` JSONB DEFAULT '[]'
- `outlook_30d` TEXT, `outlook_90d` TEXT
- `narrative_type` TEXT DEFAULT 'stabilization' (growth, stabilization, recovery, restructuring, scale_preparation)
- `confidence` NUMERIC(3,2) DEFAULT 0.5
- `created_at`
- Index: `(workspace_id, snapshot_type, created_at DESC)`

**`executive_decision_packs`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `title` TEXT NOT NULL, `decision_type` TEXT NOT NULL (increase_followup, focus_high_ticket, reinforce_recovery, rebalance_agents, reduce_backlog, update_context, change_channel_mix)
- `context_json` JSONB DEFAULT '{}', `options_json` JSONB DEFAULT '[]'
- `recommended_option` TEXT, `rationale` TEXT
- `expected_impact` TEXT, `confidence` NUMERIC(3,2) DEFAULT 0.5
- `status` TEXT DEFAULT 'pending' (pending, accepted, dismissed, executed)
- `created_at`, `updated_at`

**`executive_mode_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `default_mode` TEXT DEFAULT 'board'
- `include_forecast` BOOLEAN DEFAULT true
- `include_strategy` BOOLEAN DEFAULT true
- `include_risks` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (4)

#### 1. `supabase/functions/generate-executive-brief/index.ts`
Edge function que:
1. Recebe `{ workspace_id, snapshot_type? }`
2. Recolhe sinais: `business_context` (metas), `workspace_operating_state` (health), último `strategic_state_snapshots` (growth_mode, bottleneck), último `forecast_runs` baseline (revenue forecast), `business_objectives` (on_track/at_risk count), `strategic_recommendations` (pending)
3. Usa Gemini Flash com tool calling para gerar: summary, 3 wins, 3 risks, 3 priorities, key decisions, outlook 30/90d, narrative_type
4. Insere `executive_snapshots`
5. Gera `executive_decision_packs` a partir das decisões identificadas
6. Emite `EXECUTIVE.SNAPSHOT_CREATED`, `EXECUTIVE.BRIEF_GENERATED`, `EXECUTIVE.DECISION_PACK_CREATED`

#### 2. `src/hooks/useExecutiveBoard.ts`
- `useExecutiveSnapshot(type?)` — último snapshot com filtro por tipo
- `useExecutiveSnapshots()` — lista para histórico
- `useDecisionPacks(statusFilter?)` — lista decision packs
- `useGenerateBrief()` — invoca `generate-executive-brief`
- `useExecutiveSettings()` — read/upsert settings
- `useActOnDecision()` — marca decision pack como accepted/dismissed

#### 3. `src/pages/BoardCenterPage.tsx`
Rota: `/dashboard/board`
- **Toggle Board / Investor** no topo
- **Executive Summary**: narrative_type badge, summary, confidence
- **Revenue Triad**: actual vs target vs forecast (barras visuais)
- **Pipeline Adequacy**: pipeline_actual vs pipeline_required
- **Health Gauges**: execution, strategic, context (3 mini gauges)
- **Wins / Risks / Priorities**: 3 colunas com listas
- **Decision Packs**: cards com título, rationale, opções, botões aceitar/dispensar
- **Outlook**: 30d e 90d narrativos
- **Investor Cards** (visíveis só em Investor Mode): crescimento vs meta, previsibilidade, eficiência, risco de execução, concentração de receita, readiness to scale, confiança forecast
- **Histórico**: snapshots anteriores
- **Settings**: toggles include_forecast, include_strategy, include_risks
- Botão "Gerar Briefing Executivo"

#### 4. `src/components/executive/InvestorViewCards.tsx`
Componente com cards específicos do modo Investor:
- Crescimento vs Meta (% atingido)
- Previsibilidade (confidence do forecast)
- Eficiência Operacional (execution_health)
- Risco de Execução (risk_level)
- Readiness to Scale (strategic_health + context_health combinados)
- Confiança do Forecast (confidence)

---

### Ficheiros a alterar (1)

#### 5. `src/routes/AIRoutes.tsx`
- Adicionar lazy import `BoardCenterPage` + rota `/dashboard/board`

---

### Fluxo

```text
generate-executive-brief (manual ou periódico)
  │
  ├─ Recolhe sinais (context, health, strategy, forecast, objectives)
  ├─ Gemini Flash → diagnóstico executivo + narrative
  ├─ Gera executive_snapshots
  ├─ Gera executive_decision_packs
  └─ Emite EXECUTIVE.* events

BoardCenterPage (UI)
  │
  ├─ Toggle Board / Investor
  ├─ Executive Summary + narrative badge
  ├─ Revenue triad (actual/target/forecast)
  ├─ Health gauges
  ├─ Wins / Risks / Priorities
  ├─ Decision Packs (aceitar/dispensar)
  ├─ Investor Cards (modo Investor)
  ├─ Outlook 30/90d
  └─ Settings + Histórico
```

### Compatibilidade
- Consome `strategic_state_snapshots`, `forecast_runs`, `business_objectives` como read-only
- Reutiliza `emitKernelEvent` para eventos `EXECUTIVE.*`
- Não duplica lógica de forecast/strategy — apenas lê outputs
- Estrutura preparada para exportação PDF futura (campos wins/risks/priorities/outlook em JSON)

