

## Multi-Agent Revenue Operations — Diagnóstico e Plano

### Diagnóstico: Infraestrutura Já Existente

Após análise detalhada do código, **a grande maioria da arquitetura descrita já está implementada**:

| Fase | Estado | Detalhe |
|------|--------|---------|
| A — Papéis de Agente | ✅ Feito | `bots` tem `role`, `team_id`, `specialization`, `objective_scope`, `execution_permissions`. `AGENT_ROLES` com 8 papéis definidos |
| B — Agent Teams | ✅ Feito | Tabela `agent_teams` + `AgentTeamManager` UI com CRUD completo |
| C — Agent Router | ✅ Feito | Edge function `route-agent-task` com role-mapping, workload balancing, capacity check, human fallback |
| D — Agent Handoffs | ✅ Feito | Tabela `agent_handoffs` + `useCreateHandoff` + UI na tab Handoffs |
| E — Agent Work Items | ✅ Feito | Tabela `agent_work_items` + `useCreateWorkItem` + `useCompleteWorkItem` + UI com filtros |
| F — Supervisor Agent | ❌ Falta | Sem lógica de supervisor nem UI dedicada |
| G — Ligação a Objetivos | ✅ Feito | Tabela `objective_agent_links` com FK para teams e bots |
| H — Command Center + Context OS | ❌ Falta | Sem integração de agente recomendado ou handoffs no ContextOS |
| I — UI de Orquestração | ✅ Parcial | `AgentOperationsPage` existe com KPIs, work items, handoffs, teams, settings. Falta tab de performance/analytics |
| J — Analytics por Agente | ❌ Parcial | `useBotAnalytics` existe (conversations, leads, bookings, handovers). Falta revenue influenced, tempo médio, throughput |
| K — Permissões | ✅ Parcial | Campo `execution_permissions` existe nos bots. Falta UI de edição e validação no router |
| L — Human Fallback | ✅ Feito | Router escala para humano quando sem agente ou capacidade excedida |
| M — Kernel Events | ✅ Parcial | `AGENT.ROUTED` e `AGENT.ESCALATED_TO_HUMAN` emitidos. Faltam `WORK_ITEM_CREATED`, `WORK_COMPLETED`, `WORK_FAILED`, `HANDOFF_COMPLETED`, `SUPERVISOR_ALERT` |
| N — Settings | ✅ Feito | `agent_ops_settings` com todos os campos + UI |

---

### O que falta implementar (scope real)

**1. Supervisor Engine** — Edge function `supervisor-agent-check` que:
- Lê KPIs por agente (work items completed/failed ratio, tempo médio)
- Identifica agentes com alta taxa de falha ou baixa throughput
- Redistribui work items de agentes sobrecarregados
- Emite `AGENT.SUPERVISOR_ALERT`

**2. Analytics expandidos** — Adicionar tab "Performance" à `AgentOperationsPage`:
- Revenue influenced por agente (via `action_executions` + `objective_action_links`)
- Tempo médio até conclusão de work item
- Taxa de sucesso por agente
- Throughput diário
- Handoffs realizados vs bem-sucedidos

**3. Kernel Events completos** — Adicionar emissão no hook `useCompleteWorkItem` e `useCreateWorkItem`:
- `AGENT.WORK_ITEM_CREATED` ao criar
- `AGENT.WORK_COMPLETED` / `AGENT.WORK_FAILED` ao completar
- `AGENT.HANDOFF_COMPLETED` ao completar handoff

**4. Context OS integration** — Adicionar secção ao `ContextOSHub`:
- Agente recomendado por entidade (baseado no role mapping)
- Últimos handoffs relevantes
- Work items ativos na entidade

**5. Permissions UI** — Adicionar editor de permissões no detalhe do bot:
- Checkboxes para: `can_create_task`, `can_enroll_sequence`, `can_send_email`, `can_generate_recovery`, `requires_human_approval`

---

### Ficheiros a criar (3)

1. **`supabase/functions/supervisor-agent-check/index.ts`** — Motor de supervisão que analisa performance por agente, redistribui carga e emite alertas

2. **`src/components/agent-ops/AgentPerformancePanel.tsx`** — Tab de performance com métricas por agente: success rate, throughput, tempo médio, revenue influenced

3. **`src/components/agent-ops/AgentPermissionsEditor.tsx`** — Editor de permissões de execução por bot (checkboxes + save)

### Ficheiros a alterar (5)

4. **`src/pages/AgentOperationsPage.tsx`** — Adicionar tab "Performance" com `AgentPerformancePanel`

5. **`src/hooks/useAgentOperations.ts`** — Adicionar `useAgentPerformanceStats()` (métricas por bot), emitir kernel events em `useCreateWorkItem` e `useCompleteWorkItem`

6. **`src/components/context-os/ContextOSHub.tsx`** — Adicionar secção "Agentes Ativos" mostrando work items e handoffs por entidade

7. **`supabase/functions/route-agent-task/index.ts`** — Validar `execution_permissions` do bot antes de atribuir work item

8. **`src/hooks/useBots.ts`** — Adicionar `useUpdateBotPermissions()` mutation

### Migration

Nenhuma migration necessária — todas as tabelas e colunas já existem.

---

### Fluxo completo (já funcional + melhorias)

```text
Evento/Entidade
  │
  ├─ route-agent-task (✅ existe)
  │   ├─ Verifica settings (✅)
  │   ├─ Mapeia work_type → roles (✅)
  │   ├─ Seleciona bot com menor carga (✅)
  │   ├─ Valida permissões (🆕)
  │   ├─ Cria work item + emite AGENT.ROUTED (✅)
  │   └─ Fallback humano se sem agente (✅)
  │
  ├─ supervisor-agent-check (🆕)
  │   ├─ Analisa KPIs por agente
  │   ├─ Redistribui se necessário
  │   └─ Emite AGENT.SUPERVISOR_ALERT
  │
  ├─ AgentOperationsPage (✅ + 🆕 tab Performance)
  │   ├─ KPIs globais (✅)
  │   ├─ Work Items com filtros (✅)
  │   ├─ Handoffs (✅)
  │   ├─ Teams (✅)
  │   ├─ Performance por agente (🆕)
  │   └─ Settings (✅)
  │
  └─ ContextOSHub (🆕 secção agentes)
      ├─ Agente recomendado
      ├─ Work items ativos
      └─ Handoffs recentes
```

