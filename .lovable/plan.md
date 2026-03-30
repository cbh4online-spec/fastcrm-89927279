

## Enterprise Operating Ledger — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `kernel_events` — já tem `correlation_id`, `causation_id`, `idempotency_key`, `entity_kind`, `entity_id`, `payload`, `metadata_json`
- `kernel-ingest-event` — pipeline completa com matrix, signals, decisions, actions
- `emitKernelEvent` — client-side emitter com correlation/causation
- `kernel_entities`, `kernel_signals`, `kernel_decisions`, `kernel_actions` — EDA completa

**O que falta:**
- `operating_ledger_chains` — agrupamento causal de eventos
- `operating_ledger_links` — relações parent/child entre eventos
- `ledger_settings` — configuração por workspace
- Chain builder (edge function)
- Ledger Center UI com drill-down

**Decisão arquitectural:** Não duplicar eventos numa tabela `operating_ledger_events` separada. Os `kernel_events` já contêm toda a informação necessária (correlation_id, causation_id, entity_kind, payload). O ledger adiciona apenas a camada de **chains** e **links** sobre os eventos existentes, evitando duplicação de dados.

---

### Migration SQL (1 migration, 3 tabelas)

**`operating_ledger_chains`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `root_event_id` UUID (referência a kernel_events)
- `correlation_id` TEXT NOT NULL
- `chain_type` TEXT NOT NULL (lead_journey, recovery_journey, opportunity_journey, objective_execution, mission_execution, action_chain, agent_handoff_chain, strategy_to_execution, forecast_to_action)
- `title` TEXT, `status` TEXT DEFAULT 'active' (active, completed, failed, stalled)
- `outcome_type` TEXT, `outcome_id` TEXT, `outcome_value` NUMERIC, `outcome_currency` TEXT DEFAULT 'EUR', `outcome_summary` TEXT, `success_score` INT
- `event_count` INT DEFAULT 0
- `started_at` TIMESTAMPTZ, `ended_at` TIMESTAMPTZ
- `created_at`, `updated_at`
- Index: `(workspace_id, correlation_id)`, `(workspace_id, chain_type, created_at DESC)`

**`operating_ledger_links`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `chain_id` UUID FK → operating_ledger_chains
- `event_id` UUID NOT NULL (referência a kernel_events)
- `parent_event_id` UUID (referência a kernel_events, nullable)
- `relation_type` TEXT NOT NULL (caused, triggered, executed, updated, resolved, converted, escalated, completed)
- `depth` INT DEFAULT 0
- `created_at`
- Index: `(chain_id, depth)`, `(event_id)`

**`ledger_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `auto_chain_build` BOOLEAN DEFAULT true
- `max_chain_depth` INT DEFAULT 20
- `retain_raw_payloads` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE/DELETE.

---

### Ficheiros a criar (3)

#### 1. `supabase/functions/process-ledger-chains/index.ts`
Edge function que:
1. Recebe `{ workspace_id }` ou é chamada periodicamente
2. Busca `kernel_events` recentes sem chain associada (LEFT JOIN operating_ledger_links)
3. Agrupa por `correlation_id`
4. Para cada grupo:
   - Deteta root event (sem `causation_id` ou primeiro cronologicamente)
   - Infere `chain_type` pelo `entity_kind` e `type` do root (ex: entity_kind=cart → recovery_journey, entity_kind=objective → objective_execution)
   - Cria/atualiza `operating_ledger_chains`
   - Cria `operating_ledger_links` com parent/child baseado em `causation_id`
   - Calcula `depth` por evento
   - Resolve outcomes: se último evento contém payment/conversion/completion → preenche outcome fields
   - Atualiza `status` da chain (completed se outcome resolvido, failed se eventos de erro)
5. Emite `LEDGER.CHAIN_CREATED`, `LEDGER.OUTCOME_RESOLVED` via kernel

#### 2. `src/hooks/useLedger.ts`
- `useLedgerChains(typeFilter?, statusFilter?)` — lista chains com paginação
- `useLedgerChainDetail(chainId)` — chain + links + eventos associados (JOIN kernel_events)
- `useLedgerSettings()` — read/upsert settings
- `useRefreshLedger()` — invoca `process-ledger-chains`
- `useLedgerStats()` — contagens por chain_type, status, outcomes com valor
- `useLedgerSearch(query)` — pesquisa por correlation_id, entity_id, outcome_type

#### 3. `src/pages/LedgerCenterPage.tsx`
Rota: `/dashboard/ledger`
- **Resumo Executivo**: total chains, completed, failed, receita total atribuída
- **Chains Recentes**: lista com chain_type badge, status, título, outcome, started_at
- **Filtros**: por chain_type, status, período
- **Chain Detail** (drill-down inline ou modal):
  - Timeline vertical dos eventos (ordered by depth/occurred_at)
  - Cada nó mostra: event type, entity_kind, entity_id, actor, timestamp
  - Relações parent→child com relation_type badge
  - Outcome summary no final
  - Receita associada se existir
- **Top Causal Chains**: chains com maior outcome_value
- **Chains Falhadas**: chains com status=failed para debug
- **Pesquisa**: por correlation_id / entity_id
- **Settings**: toggles auto_chain_build, max_chain_depth, retain_raw_payloads
- Botão "Reconstruir Chains"

---

### Ficheiros a alterar (2)

#### 4. `src/routes/AIRoutes.tsx`
- Adicionar lazy import `LedgerCenterPage` + rota `/dashboard/ledger`

#### 5. `supabase/functions/kernel-ingest-event/index.ts`
- Após inserir evento com sucesso, se `correlation_id` existe, fazer fire-and-forget insert em `operating_ledger_links` com o event_id e parent via causation_id (se existir). Isto garante ingestão incremental sem depender apenas do batch builder.

---

### Fluxo

```text
kernel-ingest-event (cada evento)
  │
  ├─ Insere kernel_events (existente)
  ├─ Se correlation_id existe:
  │   └─ Insere operating_ledger_links (incremental)
  │
process-ledger-chains (batch, manual ou periódico)
  │
  ├─ Agrupa eventos orphan por correlation_id
  ├─ Cria/atualiza operating_ledger_chains
  ├─ Resolve parent/child via causation_id
  ├─ Infere chain_type
  ├─ Resolve outcomes (payment, conversion, completion)
  └─ Emite LEDGER.* events

LedgerCenterPage (UI)
  │
  ├─ Chains recentes + filtros
  ├─ Chain detail com timeline
  ├─ Top causal chains (receita)
  ├─ Chains falhadas
  ├─ Pesquisa
  └─ Settings
```

### Compatibilidade
- Consome `kernel_events` como read-only (não duplica)
- Reutiliza `correlation_id` e `causation_id` já emitidos por todos os módulos
- Reutiliza `emitKernelEvent` para eventos `LEDGER.*`
- Board Mode e Strategy podem consumir chains com outcomes para validar impacto real
- Memory pode usar chains completas como evidência de padrões
- Não altera nenhuma tabela existente (apenas adiciona insert incremental no ingest)

