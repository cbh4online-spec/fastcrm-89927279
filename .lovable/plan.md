

## Next Best Action Engine — Plano de Execução

### Diagnóstico

**Infraestrutura existente:**
- `ContextOSHub` — grid de blocos estratégicos com score global, editor inline
- `ContextOSDashboard` — dashboard avançado com tabs (Blocos, Bindings, Alertas, Eventos, Métricas), já usa `ContextActionsPanel`
- `ContextActionsPanel` — gera ações via IA (`useAIGenerateActions`), mas são efémeras (state local, sem persistência)
- `emitKernelEvent` / `kernel-ingest-event` — padrão consolidado em 8+ edge functions
- `kernel_events` — tabela com realtime subscription
- `optimization_recommendations` — modelo similar (entity_type, status open/applied/dismissed, confidence)
- `communication_attributions` — revenue por template/sequence/contact
- `workspace_template_stats` — scores por template
- `ContextOSPage` — renderiza WizardShell ou ContextOSHub conforme score

**O que falta:**
1. `next_best_actions` — tabela de recomendações comerciais persistidas
2. `next_best_action_settings` — config por workspace
3. `next_best_action_logs` — auditoria
4. Edge function de processamento (collect signals → decision engine → persist)
5. UI de NBA integrada no ContextOS (não paralela)
6. Hook de leitura/ação

---

### Migration SQL (1 migration)

**`next_best_actions`:**
- `id` UUID PK, `workspace_id`, `entity_type` TEXT, `entity_id` UUID
- `action_type` TEXT, `title` TEXT, `description` TEXT, `rationale` TEXT
- `priority_score` INT (0-100), `confidence` TEXT (low/medium/high)
- `impact_estimate` NUMERIC(12,2), `urgency` TEXT (low/medium/high/critical)
- `due_at` TIMESTAMPTZ nullable
- `status` TEXT DEFAULT 'open' (open, acted, dismissed, expired)
- `source_signals_json` JSONB, `suggested_payload_json` JSONB
- `created_at`, `updated_at`, `acted_at`, `dismissed_at`
- UNIQUE `(workspace_id, entity_type, entity_id, action_type, status)` WHERE status = 'open'

**`next_best_action_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE
- `is_enabled` BOOLEAN DEFAULT false, `refresh_interval_minutes` INT DEFAULT 60
- `stale_context_threshold` INT DEFAULT 14, `min_priority_to_show` INT DEFAULT 20
- `enable_auto_generation` BOOLEAN DEFAULT true
- `created_at`, `updated_at`

**`next_best_action_logs`:**
- `id` UUID PK, `workspace_id`, `action_id` UUID FK, `event_type` TEXT
- `before_json` JSONB, `after_json` JSONB
- `actor_type` TEXT, `actor_id` TEXT, `created_at`

Índices: `(workspace_id, status)`, `(entity_type, entity_id)`, `(priority_score DESC)`

RLS: workspace members SELECT; service_role INSERT/UPDATE.

---

### Ficheiros a criar (4)

#### 1. `supabase/functions/process-next-best-actions/index.ts`
Edge function que:
1. Recebe `{ workspace_id }` ou batch
2. Lê `next_best_action_settings`
3. Recolhe sinais por entidade elegível:
   - Leads/contacts com `last_activity` antiga → `re-engage_silent_lead`
   - Oportunidades com stage avançado + sem follow-up → `escalate_opportunity`, `send_proposal`
   - Carrinhos abandonados sem recovery → `recover_abandoned_cart`
   - Propostas enviadas sem resposta → `follow_after_proposal`
   - Context score baixo → `refresh_context`
   - Leads com high score sem ação → `call_now`, `schedule_meeting`
   - Sequências com baixa performance → `pause_sequence`
   - Revenue attribution alta sem follow-up → `send_followup_email`
4. Calcula `priority_score` = f(potential_revenue × 0.3 + urgency × 0.25 + conversion_prob × 0.2 + risk × 0.15 + recency_penalty × 0.1)
5. Insere em `next_best_actions` (ON CONFLICT DO NOTHING para open)
6. Expira ações open com mais de 7 dias
7. Emite `NBA.CREATED` via kernel-ingest-event

#### 2. `src/hooks/useNextBestActions.ts`
- `useNextBestActions(filters?)` — lista NBAs com status/entity filters + realtime
- `useNBASettings()` — read/upsert settings
- `useActOnNBA()` — mutation: status → 'acted', regista log, emite NBA.ACTED
- `useDismissNBA()` — mutation: status → 'dismissed', emite NBA.DISMISSED
- `useNBAStats()` — KPIs: open count, acted today, potential revenue, overdue

#### 3. `src/components/context-os/NextBestActionsPanel.tsx`
Componente integrado no ContextOSHub/Dashboard:
- Lista top NBAs por priority_score
- Cada card: título, entidade, prioridade (badge colorido), impacto estimado, urgência, rationale
- Botões: Agir (abre entidade/compose), Ignorar, Ver detalhe
- Filtros inline: entity_type, urgency
- Empty state com botão para gerar manualmente

#### 4. `src/components/context-os/NextBestActionDetail.tsx`
Modal/drawer de detalhe:
- Sinais que originaram (source_signals_json formatado)
- Ação sugerida + payload
- Impacto estimado + confiança
- Quick actions: link para entidade, compose email, abrir oportunidade
- Histórico de logs da ação

---

### Ficheiros a alterar (2)

#### 5. `src/components/context-os/ContextOSHub.tsx`
- Adicionar secção "Próximas Ações" abaixo do grid de blocos
- Renderizar `NextBestActionsPanel` com top 5 ações
- Mostrar KPI cards: ações pendentes, receita potencial, ações vencidas

#### 6. `src/routes/crm/DashboardCoreRoutes.tsx`
- Sem nova rota necessária — NBA vive dentro do ContextOS existente (/dashboard/context-os)
- Nenhuma alteração de routing se o painel for integrado no Hub

*(Alternativa: se quiser acesso direto, adicionar rota `/dashboard/next-best-actions` que renderiza ContextOSPage com tab NBA ativa)*

---

### Fluxo

```text
process-next-best-actions (cron/manual)
  │
  ├─ Lê settings (thresholds, enabled?)
  ├─ Query entidades elegíveis (leads, contacts, opportunities, carts)
  ├─ Para cada entidade:
  │   ├─ Recolhe sinais (activity, attribution, scores, context freshness)
  │   ├─ Avalia regras → gera action_type + rationale
  │   └─ Calcula priority_score
  ├─ Insere next_best_actions (idempotente)
  ├─ Expira ações antigas
  └─ Emite NBA.CREATED kernel events

ContextOSHub (UI)
  │
  ├─ NextBestActionsPanel (top ações por prioridade)
  ├─ Agir → marca acted, emite NBA.ACTED, abre entidade
  ├─ Ignorar → marca dismissed, emite NBA.DISMISSED
  └─ Detalhe → NextBestActionDetail (sinais, payload, logs)
```

### Eventos Kernel
- `NBA.CREATED`, `NBA.ACTED`, `NBA.DISMISSED`, `NBA.EXPIRED`

### Compatibilidade
- ContextOS mantido intacto — NBA é secção adicional no Hub
- `ContextActionsPanel` existente (ações IA efémeras) coexiste — NBA é persistido e priorizado
- `optimization_recommendations` não é duplicado — NBA foca em ações comerciais por entidade, optimizations foca em variantes/templates
- Kernel events seguem padrão existente

