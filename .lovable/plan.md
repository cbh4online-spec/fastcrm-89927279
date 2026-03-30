

## Enterprise Memory & Learning Layer — Plano de Execução

### Diagnóstico

**Infraestrutura existente reutilizada:**
- `kernel_events` — matéria-prima para extração de memórias
- `action_executions` — outcomes de ações para correlacionar com memórias
- `business_objectives` + `objective_action_links` — resultados por objetivo
- `agent_work_items` + `agent_handoffs` — performance por agente
- `workspace_operating_state` + `workspace_missions` — contexto operacional
- `next_best_actions` + `optimization_recommendations` — consumidores de memória
- `process-workspace-engine` — pode invocar extração de memória
- `emitKernelEvent` — padrão de eventos consolidado

**Nada disto existe ainda** — sistema de memória totalmente novo.

---

### Migration SQL (1 migration, 4 tabelas)

**`workspace_memories`:**
- `id` UUID PK, `workspace_id` UUID NOT NULL
- `memory_type` TEXT NOT NULL (success_pattern, failure_pattern, execution_lesson, routing_lesson, conversion_pattern, recovery_pattern, context_gap_pattern, agent_performance_pattern)
- `title` TEXT NOT NULL, `summary` TEXT
- `source_type` TEXT, `source_id` TEXT, `entity_type` TEXT, `entity_id` TEXT
- `context_snapshot_json` JSONB DEFAULT '{}', `outcome_snapshot_json` JSONB DEFAULT '{}'
- `confidence` NUMERIC(3,2) DEFAULT 0.5, `importance_score` INT DEFAULT 50, `freshness_score` INT DEFAULT 100
- `validity_status` TEXT DEFAULT 'valid' (valid, aging, stale, contradicted, archived)
- `reuse_count` INT DEFAULT 0, `last_used_at` TIMESTAMPTZ
- `created_at`, `updated_at`
- Index: `(workspace_id, memory_type, validity_status)`

**`workspace_memory_links`:**
- `id` UUID PK, `workspace_id`, `memory_id` UUID FK → workspace_memories
- `linked_type` TEXT NOT NULL, `linked_id` UUID NOT NULL, `created_at`

**`workspace_learning_cycles`:**
- `id` UUID PK, `workspace_id`
- `cycle_type` TEXT NOT NULL (daily, weekly, event_triggered)
- `status` TEXT DEFAULT 'pending' (pending, running, completed, failed)
- `summary` TEXT
- `memories_created` INT DEFAULT 0, `memories_updated` INT DEFAULT 0
- `started_at`, `completed_at`, `created_at`, `updated_at`

**`memory_usage_logs`:**
- `id` UUID PK, `workspace_id`, `memory_id` UUID FK
- `used_by_type` TEXT, `used_by_id` TEXT
- `outcome_type` TEXT, `outcome_id` TEXT, `outcome_quality` TEXT (positive, neutral, negative)
- `created_at`

**`memory_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false
- `auto_extract_enabled` BOOLEAN DEFAULT false
- `min_confidence_threshold` NUMERIC(3,2) DEFAULT 0.3
- `max_memories_per_query` INT DEFAULT 5
- `memory_decay_days` INT DEFAULT 90
- `financial_weight_multiplier` NUMERIC(3,2) DEFAULT 1.5
- `created_at`, `updated_at`

RLS: workspace members SELECT; service_role INSERT/UPDATE/DELETE. Realtime on `workspace_memories`.

---

### Ficheiros a criar (4)

#### 1. `supabase/functions/process-workspace-memory/index.ts`
Edge function central que:
1. Recebe `{ workspace_id }` ou `{ workspace_id, event_type_filter }`
2. Lê últimos kernel events (24h ou desde último ciclo)
3. Agrupa eventos por entidade e tipo (TASK.*, ACTION.*, AGENT.*, OBJECTIVE.*)
4. Usa Gemini Flash para extrair padrões: o que funcionou, o que falhou, lições
5. Cria/atualiza `workspace_memories` — se padrão semelhante existe, reforça `confidence` e `reuse_count`
6. Aplica decay: memórias com `updated_at` > `memory_decay_days` passam a `aging` → `stale`
7. Regista ciclo em `workspace_learning_cycles`
8. Emite `MEMORY.CREATED` / `MEMORY.UPDATED` / `LEARNING.CYCLE_COMPLETED`

#### 2. `src/hooks/useWorkspaceMemory.ts`
- `useWorkspaceMemories(filters?)` — lista com type/validity filter + realtime
- `useMemoryStats()` — KPIs: total, by type, avg confidence, top patterns
- `useMemorySettings()` — read/upsert settings
- `useTriggerLearningCycle()` — invoca `process-workspace-memory`
- `useLearningCycles()` — lista ciclos com status
- `useLogMemoryUsage()` — mutation para registar uso + feedback

#### 3. `src/pages/MemoryCenterPage.tsx`
Rota: `/dashboard/memory`
- KPIs: memórias ativas, confiança média, padrões de sucesso vs falha, ciclos completados
- Lista filtrada por: tipo, validity, importance, recency
- Cada memória: título, summary, type badge, confidence bar, freshness, reuse count, validity status
- Secção "Padrões de Sucesso" (top 5 por confidence + importance)
- Secção "Padrões de Falha" (top 5 failure_pattern)
- Secção "Lições Recentes" (últimas 10 criadas)
- Botão "Iniciar Ciclo de Aprendizagem"
- Settings panel (toggles auto_extract, decay days, confidence threshold)

#### 4. `src/components/workspace-ops/WorkspaceLearningBrief.tsx`
Componente integrado na MemoryCenterPage:
- "O que aprendemos este mês" — memórias criadas no período
- "Padrões que ganharam força" — confidence subiu
- "Padrões obsoletos" — validity = stale/contradicted
- "Alta confiança" — top por confidence
- "Baixa confiança" — áreas onde o sistema ainda opera com pouca evidência

---

### Ficheiros a alterar (1)

#### 5. `src/routes/AIRoutes.tsx`
- Adicionar lazy import + rota: `/dashboard/memory` → `MemoryCenterPage`

---

### Fluxo

```text
Kernel Events (contínuo)
  │
  └─ process-workspace-memory (periódico ou manual)
      ├─ Lê eventos 24h
      ├─ Agrupa por entidade/tipo
      ├─ Gemini Flash extrai padrões
      ├─ Cria/reforça workspace_memories
      ├─ Aplica decay a memórias antigas
      ├─ Regista learning_cycle
      └─ Emite MEMORY.* events

Consumidores (future integration points):
  ├─ Command Center → retrieve memories por query
  ├─ NBA/Optimization → boost actions com memory support
  ├─ Agent Router → prefer agents com success patterns
  └─ Objective Planning → avoid failed strategies
```

### Compatibilidade
- Reutiliza `kernel_events` como fonte — sem alterar tabelas existentes
- Reutiliza `emitKernelEvent` para eventos `MEMORY.*`
- Não duplica centros de controlo — vive em `/dashboard/memory`
- Memory retrieval preparado para integração futura com Command Center e NBA
- Decay automático evita acumulação de memórias obsoletas

