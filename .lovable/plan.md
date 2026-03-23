

## Implementação do Modelo de Precificação IA — FastCRM

### Resumo

Implementar o sistema completo de gate/metering para chamadas IA conforme o documento enviado: 3 tabelas, edge function `ai-gate` como middleware, `ai-usage-stats`, hooks React, UI de alertas, e instrumentação das ~61 edge functions existentes.

---

### Fase 1 — Base de dados (migration SQL)

Criar migration com:
- **`workspace_plans`** — plano activo, quotas, ciclo, Stripe sub ID
- **`ai_call_log`** — registo de cada chamada IA com tier/modelo/custos
- **`overage_charges`** — cobranças acumuladas para facturação
- RLS nas 3 tabelas (policy por workspace_members)
- `ALTER workspace_settings` para adicionar `plan_id` e `ai_calls_alert_threshold`
- Função `get_plan_calls_included(plan_name)`
- RPC `upsert_overage_charge` (necessária pelo ai-gate)

**Segunda migration** para seed dos workspaces existentes (migrar planos actuais para `workspace_plans`).

---

### Fase 2 — Edge Function `ai-gate`

Criar `supabase/functions/ai-gate/index.ts`:
- Exporta `aiGate(workspaceId, tier, edgeFnName, userId)` 
- Lógica: Free bloqueia tudo; Growth inclui micro/light/medium; Pro inclui até heavy; Agent sempre overage (€0,25); Heavy em Growth = overage (€0,05)
- Regista em `ai_call_log` e acumula em `overage_charges`
- Handler HTTP para chamadas directas

---

### Fase 3 — Edge Function `ai-usage-stats`

Criar `supabase/functions/ai-usage-stats/index.ts`:
- Retorna plano, uso, percentagem, breakdown por tier, overage pendente, datas do ciclo

---

### Fase 4 — Instrumentar ~61 edge functions IA

Adicionar 4 linhas no topo de cada handler (import + gate check + early return 402):
- **Micro** (8 funções): `ai-dashboard-insights`, `ai-field-suggestions`, `ai-auto-tags`, `compute-deal-score`, etc.
- **Light** (14 funções): `ai-inbox-reply`, `ai-copilot`, `ai-template-copilot`, etc.
- **Medium** (15 funções): `ai-analyze-lead`, `company-enrich`, `knowledge-query`, etc.
- **Heavy** (21 funções): `compute-revenue-forecast`, `ask-fastcrm`, `vision-ai-copilot`, etc.
- **Agent** (6 funções): `ai-agent-orchestrator`, `ai-agent-processor`, etc.

Padrão idêntico em todas — só muda o tier string.

---

### Fase 5 — Hooks React

- **`src/hooks/useAIUsage.ts`** — query à edge function `ai-usage-stats`, refetch a cada 60s
- **`src/hooks/useAIGate.ts`** — lógica client-side para determinar `canRun`, `isOverage`, `showUpgrade`
- Actualizar `useWorkspaceSettings` com `planId` e `aiCallsAlertThreshold`

---

### Fase 6 — UI

- **`AIUsageBanner`** — banner no `DashboardLayout` (amarelo a 80%, vermelho a 100%, overage indicator)
- **`AIActionButton`** — botão wrapper que mostra custo de overage ou lock de upgrade

---

### Fase 7 — Migração de dados

Seed SQL para migrar workspaces existentes (basic→growth, pro→pro, agency→pro) e preencher `plan_id`.

---

### Detalhes técnicos

- A migration usa validation triggers em vez de CHECK com `now()` para `cycle_end`
- RLS policies usam subquery em `workspace_members` (padrão existente)
- `ai-gate` usa import relativo (`../ai-gate/index.ts`) disponível no Deno deploy
- Não se remove `module-check-credits`/`module-consume-credits` agora (coexistência) — são para módulos marketplace, não IA

