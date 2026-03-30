

## Multi-Agent Revenue Operations — Plano de Execução

### Diagnóstico

**Infraestrutura existente:**
- `bots` — modelo completo com `type`, `channel`, `ai_profile_id`, `system_prompt`, `settings` (handover, keywords, horários)
- `bot_analytics` — métricas diárias por bot (conversas, leads, bookings, handover_rate)
- `bot_runs` — log de execuções individuais
- `bot_conversation_assignments` — vínculo bot↔conversa com status (active, handed_over, completed)
- `bot_flows`, `bot_settings`, `bot_channels` — extensões existentes
- Kernel events (`emitKernelEvent`) usado em 113+ ficheiros
- Context OS, Command Center, AI Agent Jobs — infraestrutura madura
- `useBots` hook com CRUD completo

**O que não existe:**
- Conceito de "role" ou "team" nos bots
- Routing dinâmico entre agentes
- Handoffs formais e auditáveis entre bots
- Work items (tarefas atribuídas a agentes)
- Supervisão/analytics de equipa
- UI de orquestração multi-agent
- Settings de operações por workspace

---

### Migration SQL (1 migration)

**Novos campos em `bots`:**
- `role TEXT` — lead_qualifier, followup_operator, abandoned_cart_recovery, renewal_guardian, pipeline_nudger, meeting_setter, human_handoff_router, revenue_supervisor
- `team_id UUID REFERENCES agent_teams(id) ON DELETE SET NULL`
- `specialization TEXT`
- `objective_scope TEXT`
- `execution_permissions JSONB DEFAULT '{}'`

**Nova tabela `agent_teams`:**
- `id`, `workspace_id`, `name`, `description`, `objective_type`, `is_active`, `created_at`, `updated_at`
- RLS: workspace members

**Nova tabela `agent_work_items`:**
- `id`, `workspace_id`, `bot_id` FK bots, `entity_type`, `entity_id`, `work_type`, `payload_json`, `priority`, `status` (pending, assigned, in_progress, completed, failed, escalated), `routed_by`, `assigned_at`, `started_at`, `completed_at`, `failed_at`, `error_message`, `created_at`, `updated_at`
- Work types: qualify_lead, followup_contact, recover_cart, reengage_lead, propose_meeting, escalate_human, intervene_renewal, enrich_context

**Nova tabela `agent_handoffs`:**
- `id`, `workspace_id`, `from_bot_id` FK, `to_bot_id` FK nullable, `to_user_id` FK nullable, `entity_type`, `entity_id`, `trigger_type`, `trigger_reason`, `context_snapshot JSONB`, `status` (pending, accepted, completed, failed, escalated_to_human), `created_at`, `completed_at`

**Nova tabela `objective_agent_links`:**
- `id`, `workspace_id`, `objective_id`, `team_id` FK nullable, `bot_id` FK nullable, `role_in_objective`, `created_at`

**Nova tabela `agent_ops_settings`:**
- `id`, `workspace_id` UNIQUE, `is_enabled`, `auto_routing_enabled`, `auto_handoff_enabled`, `human_fallback_enabled`, `supervisor_enabled`, `max_open_items_per_agent INT DEFAULT 10`, `created_at`, `updated_at`

Índices: `agent_work_items(workspace_id, status)`, `agent_work_items(bot_id)`, `agent_handoffs(workspace_id)`, `bots(team_id)`

---

### Ficheiros a criar (5)

#### 1. `supabase/functions/route-agent-task/index.ts`
Motor de routing que:
1. Recebe `{ workspace_id, entity_type, entity_id, work_type, context }` 
2. Verifica `agent_ops_settings.is_enabled`
3. Carrega bots ativos do workspace com role compatível com work_type
4. Aplica critérios: role match → canal → especialização → carga atual (count work_items pendentes) → prioridade
5. Cria `agent_work_items` com bot_id selecionado
6. Se nenhum agente elegível → cria handoff `escalated_to_human`
7. Emite evento kernel `AGENT.ROUTED`

#### 2. `src/pages/AgentOperationsPage.tsx`
Dashboard de orquestração com:
- KPIs: work items pendentes, em progresso, handoffs hoje, taxa de sucesso
- Lista de equipas + agentes por equipa
- Tabela de work items recentes (filtros por status, work_type, bot)
- Handoffs recentes com badge de status
- Agentes com maior throughput vs mais falhas
- Botão para criar work item manual

#### 3. `src/hooks/useAgentOperations.ts`
Hook centralizado:
- `useAgentTeams()` — CRUD teams
- `useAgentWorkItems(filters)` — lista work items com status, bot, entity
- `useAgentHandoffs(filters)` — lista handoffs
- `useAgentOpsSettings()` — read/upsert settings
- `useAgentOpsStats()` — KPIs agregados
- `useCreateWorkItem()` — dispatch manual
- `useCompleteWorkItem()` — marcar como concluído
- `useCreateHandoff()` — criar handoff entre bots

#### 4. `src/components/agent-ops/AgentOpsSettings.tsx`
Formulário de configuração:
- Toggle is_enabled, auto_routing, auto_handoff, human_fallback, supervisor
- max_open_items_per_agent
- Upsert em `agent_ops_settings`

#### 5. `src/components/agent-ops/AgentTeamManager.tsx`
CRUD de equipas:
- Lista de equipas com agentes associados
- Criar/editar equipa (nome, descrição, objective_type)
- Drag-and-drop ou select para associar bots à equipa (update `bots.team_id`)

---

### Ficheiros a alterar (4)

#### 6. `src/hooks/useBots.ts`
- Expandir interface `Bot` com `role`, `team_id`, `specialization`, `objective_scope`, `execution_permissions`
- Expandir `CreateBotData` com campos novos
- Adicionar query `useBotsByTeam(teamId)`

#### 7. `src/routes/AIRoutes.tsx`
- Importar `AgentOperationsPage`
- Adicionar rota: `<Route path="/dashboard/agent-ops" element={<AgentOperationsPage />} />`

#### 8. `src/pages/AIEmployeesPage.tsx`
- Adicionar badge de `role` e `team` em cada BotCard (se existirem)
- Adicionar link rápido para Agent Operations

#### 9. `src/components/ai-employees/BotWizard.tsx` (ou formulário equivalente)
- Adicionar campo `role` (select com papéis pré-definidos)
- Adicionar campo `team_id` (select com equipas do workspace)
- Adicionar campo `specialization` (texto livre)

---

### Fluxo final

```text
Trigger (evento kernel, UI manual, cron)
  │
  └─ route-agent-task
       │
       ├─ Carrega agent_ops_settings (enabled?)
       ├─ Identifica work_type + entity
       ├─ Filtra bots por role + status + carga
       ├─ Seleciona melhor agente
       │
       ├─ Cria agent_work_items (status=assigned)
       ├─ Emite AGENT.ROUTED
       │
       └─ Se nenhum agente:
           ├─ Cria agent_handoffs (escalated_to_human)
           └─ Emite AGENT.ESCALATED_TO_HUMAN

Bot executa work item (via processo existente ou futuro executor)
  │
  ├─ Sucesso → status=completed, emite AGENT.WORK_COMPLETED
  ├─ Falha → status=failed, emite AGENT.WORK_FAILED
  └─ Handoff → cria agent_handoffs, emite AGENT.HANDOFF_CREATED
       └─ Novo bot recebe work item

AgentOperationsPage (UI)
  │
  ├─ Visualiza KPIs, work items, handoffs
  ├─ Dispatch manual de work items
  └─ Override: reatribuir, cancelar, escalar
```

### Eventos Kernel emitidos
- `AGENT.WORK_ITEM_CREATED`
- `AGENT.ROUTED`
- `AGENT.HANDOFF_CREATED`
- `AGENT.HANDOFF_COMPLETED`
- `AGENT.ESCALATED_TO_HUMAN`
- `AGENT.WORK_COMPLETED`
- `AGENT.WORK_FAILED`

### Compatibilidade
- Tabela `bots` evolui com campos opcionais (nullable) — bots existentes continuam a funcionar
- `bot_analytics`, `bot_runs`, `bot_conversation_assignments` inalterados
- AI Employees page mantém layout, apenas adiciona badges informativos
- `useBots` hook expandido sem breaking changes
- Supervisor agent fica como conceito lógico (analytics + alertas na UI), sem bot conversacional dedicado nesta V1

### Scope V1 vs Futuro
| V1 (esta fase) | Futuro |
|---|---|
| Roles + Teams + Work Items + Handoffs | Supervisor agent autónomo |
| Routing rule-based | Routing ML-based |
| UI de orquestração read/dispatch | Workflow visual de routing |
| Handoff manual + trigger-based | Handoff LLM-decided |
| Analytics por agente via work_items | Revenue attribution completa |

