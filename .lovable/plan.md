

## Motor de Atribuição de Receita — Plano de Execução

### Diagnóstico

**O que já existe:**
- `workspace_template_stats` — stats por template com `reply_rate`, `opportunity_rate`, `win_rate`, `score` (mas sem revenue)
- `template_log_events` — eventos por template (`inserted`, `sent`, `delivered`, `opened`, `clicked`, `replied`, `opportunity_created`, `deal_won`) via edge function `template-log-event`
- `email_sequences` + `email_sequence_steps` + `email_sequence_enrollments` — CRUD completo
- `store_orders` com `contact_id`, `abandoned_cart_id`, `total`, `status`
- `stripe-webhook` — processa pagamentos: marca `store_orders` como paid, `opportunities` como won, `proposals` como paid, cria `payments`
- `store_abandoned_carts` com `sequence_id`, `sequence_enrollment_id`, `outreach_status`
- `process-store-recovery` — enrollment + processamento de sequências para carrinhos
- `storeRecoveryTemplateVariables.ts` — merge variables

**O que falta:**
1. `communication_attributions` — tabela de atribuição receita↔comunicação
2. `communication_attribution_settings` — config por workspace
3. Edge function de processamento de atribuição
4. Normalização de conversões
5. Lógica de touch resolution (last-touch, assisted-touch, first-touch)
6. UI de revenue por template/sequence/step/canal
7. Hook de atribuição na stripe-webhook (trigger point)

---

### Migration SQL (1 migration)

**Nova tabela `communication_attributions`:**
- `id` UUID PK, `workspace_id`, `contact_id`, `template_id` FK nullable, `sequence_id` FK nullable, `sequence_step_id` FK nullable, `enrollment_id` FK nullable, `channel` TEXT, `provider` TEXT
- `context_type` TEXT, `context_id` UUID — e.g., 'abandoned_cart', cart_id
- `conversion_type` TEXT — store_order, opportunity_won, proposal_paid, payment_completed
- `conversion_id` UUID, `conversion_value` NUMERIC(12,2), `currency` TEXT DEFAULT 'EUR'
- `attribution_model` TEXT — last_touch, assisted_touch, first_touch
- `attribution_weight` NUMERIC(5,4) DEFAULT 1.0, `touch_type` TEXT — direct, assist, recovery
- `sent_at` TIMESTAMPTZ, `conversion_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- UNIQUE constraint on `(conversion_id, conversion_type, attribution_model, template_id, sequence_step_id)` para idempotência

**Nova tabela `communication_attribution_settings`:**
- `id` UUID PK, `workspace_id` UNIQUE, `default_model` TEXT DEFAULT 'last_touch'
- `attribution_window_days` INT DEFAULT 7, `allow_email_fallback` BOOLEAN DEFAULT true
- `include_assists` BOOLEAN DEFAULT true, `created_at`, `updated_at`

Índices: `communication_attributions(workspace_id, conversion_type)`, `(template_id)`, `(sequence_id)`, `(contact_id)`, `(conversion_id)`

RLS: workspace members SELECT; service_role INSERT/UPDATE

---

### Ficheiros a criar (5)

#### 1. `supabase/functions/_shared/analytics/normalize-conversion.ts`
Normaliza conversões de diferentes fontes para formato único:
- `store_orders` pagos → `{ conversionType: 'store_order', conversionId, contactId, amount: total, currency, occurredAt: paid_at }`
- `opportunities` won → `{ conversionType: 'opportunity_won', amount: value, occurredAt: updated_at }`
- `proposals` paid → `{ conversionType: 'proposal_paid', amount: total, occurredAt: accepted_at }`
- `payments` completed → `{ conversionType: 'payment_completed', amount, occurredAt: created_at }`
- Resolve `contact_id` por email fallback quando `allow_email_fallback = true`

#### 2. `supabase/functions/_shared/analytics/find-touchpoints.ts`
Encontra touchpoints (template_log_events com `event_type IN ('sent','delivered')`) para um `contact_id` dentro da janela de atribuição:
- Query `template_log_events` por `contact_id` + window
- Ordena por proximidade temporal à conversão
- Retorna array de touches com `template_id`, `sequence_step_id`, `channel`, `sent_at`
- Aplica modelo: last_touch (100% ao último), assisted_touch (70/30), first_touch (100% ao primeiro)

#### 3. `supabase/functions/process-communication-attribution/index.ts`
Edge function principal:
1. Recebe `{ workspace_id, conversion_type, conversion_id }` ou processa batch por workspace
2. Lê settings de atribuição
3. Normaliza a conversão
4. Encontra touchpoints elegíveis
5. Calcula pesos por modelo
6. Insere `communication_attributions` (idempotente via UNIQUE constraint + ON CONFLICT DO NOTHING)
7. Regista eventos em `store_automation_events`

#### 4. `src/hooks/useCommunicationAttribution.ts`
Hooks de leitura:
- `useRevenueByTemplate(filters)` — agregação por template_id
- `useRevenueBySequence(filters)` — agregação por sequence_id
- `useRevenueByChannel(filters)` — agregação por canal
- `useRevenueByStep(sequenceId)` — revenue por step de uma sequência
- `useAttributionSettings()` — read/upsert settings
- `useTemplateRevenueDetail(templateId)` — lista de conversões ligadas

#### 5. `src/components/communication/RevenueAttributionDashboard.tsx`
Componente reutilizável com:
- KPIs: receita total atribuída, conversões, AOV, revenue per send, assisted revenue
- Leaderboard por template (top 10)
- Leaderboard por sequence
- Leaderboard por channel
- Filtros: período, modelo de atribuição, conversion_type
- Integrado como tab em TemplatesListPage e SequencesListPage

---

### Ficheiros a alterar (3)

#### 6. `supabase/functions/stripe-webhook/index.ts`
Nos pontos de conversão existentes, invocar `process-communication-attribution` (non-blocking):
- Após `handleStoreOrderCompleted` (store_order paid) → `{ conversion_type: 'store_order', conversion_id: orderId }`
- Após opportunity marked as won → `{ conversion_type: 'opportunity_won', conversion_id: opportunityId }`
- Após proposal payment_status paid → `{ conversion_type: 'proposal_paid', conversion_id: proposalId }`
Invocação via `fetch` interno (non-blocking `.catch()`)

#### 7. `src/components/communication/TemplatesListPage.tsx`
- Adicionar tab "Receita" ao lado das tabs existentes
- Renderizar `RevenueAttributionDashboard` filtrado por template
- Nos cards de template, mostrar badge de receita atribuída quando > 0

#### 8. `src/components/sequences/SequencesListPage.tsx`
- Adicionar tab "Receita" ou secção de KPIs de revenue
- Nos cards de sequência, mostrar receita atribuída total
- No detalhe da sequência, mostrar revenue por step

---

### Fluxo final

```text
Stripe Webhook (conversão)
  │
  ├─ Marca store_order/opportunity/proposal
  ├─ Invoca process-communication-attribution (async)
  │
  └─ process-communication-attribution
       │
       ├─ Normaliza conversão (normalize-conversion)
       ├─ Resolve contact_id (direto ou por email fallback)
       ├─ Encontra touchpoints (find-touchpoints)
       │   └─ template_log_events WHERE contact_id + window
       ├─ Aplica modelo (last_touch / assisted_touch / first_touch)
       ├─ Insere communication_attributions (idempotente)
       └─ Emite evento tracking

Frontend (TemplatesListPage / SequencesListPage)
  │
  ├─ useCommunicationAttribution hooks
  ├─ RevenueAttributionDashboard
  └─ Revenue badges nos cards
```

### Compatibilidade
- `template_log_events` é a fonte de touchpoints — já regista `sent`, `delivered`, `opportunity_created`, `deal_won` com `contact_id` e `template_id`
- `workspace_template_stats` mantido intacto (foco em reply/opportunity rates)
- `stripe-webhook` apenas adiciona invocação async no final dos handlers existentes
- `process-store-recovery` não é alterado
- Atribuição é calculada post-facto, não interfere com fluxos de envio

