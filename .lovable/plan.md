

# Fase 3 -- Motor de Retencao B2B (Reposicao + Favoritos + Assinaturas + Stock)

## Estado Actual do Codebase

O Portal B2B ja tem:
- `client_users` com `company_id` e `workspace_id` (multi-tenant)
- Sistema de roles (`client_admin`, `client_financial`, `client_operational`, `client_viewer`)
- `useClientOrders` com `order_notes` + `order_note_items` (status inclui `invoiced`)
- `useClientFavorites` (para produtos, via `client_favorites`)
- `useProtocols` + `useProtocolKits` (protocolos com kits basico/avancado)
- `CartContext` com IVA automatico
- `useClientApprovals` (workflow de aprovacao)
- Edge function `whatsapp-send-message` (ja existe)
- Edge function `order-note-submit` (envio email via Resend)
- Stripe integrado no sistema

O que **nao existe** e sera criado:
- Alertas de reposicao (tabelas, edge functions, paginas)
- Protocolos favoritos (distinto de produtos favoritos)
- Planos de manutencao recorrente (assinatura B2B)
- Gestao de stock e previsao (admin CRM)

---

## Fase 3.1 -- Migracao de Base de Dados (12 tabelas novas)

### Bloco A: Alertas de Reposicao

```
client_notification_settings
  id, workspace_id, company_id, channel_email (bool default true),
  channel_whatsapp (bool default false), frequency (text: weekly/biweekly/monthly),
  opt_in_whatsapp (bool default false), quiet_hours_start (time),
  quiet_hours_end (time), created_at, updated_at

client_replenishment_rules
  id, workspace_id, company_id, scope (text: category/line/protocol/product),
  reference_id (text), reorder_threshold_days (int default 30),
  min_qty_suggestion (int default 1), is_active (bool default true), created_at

client_replenishment_suggestions
  id, workspace_id, company_id, suggested_items (jsonb),
  reason (text), confidence_score (numeric),
  status (text: new/sent/dismissed/converted), sent_at, converted_order_id,
  created_at
```

### Bloco B: Protocolos Favoritos

```
client_favorite_protocols
  id, workspace_id, company_id, protocol_id (FK product_protocols),
  created_by (FK client_users), default_kit_level (text: basic/advanced),
  notes (text), created_at

client_favorite_protocol_overrides
  id, workspace_id, company_id, protocol_id, product_id,
  default_qty (int), created_at
```

### Bloco C: Planos de Manutencao Recorrente

```
b2b_subscription_plans
  id, workspace_id, company_id, name (text), cadence (text: monthly/bi-monthly/quarterly),
  status (text: active/paused/cancelled/draft), approval_mode (text: auto/approval_required),
  max_cycle_value (numeric), stripe_subscription_id (text),
  next_run_at (timestamptz), created_by (FK client_users),
  created_at, updated_at

b2b_subscription_plan_items
  id, plan_id (FK b2b_subscription_plans), product_id (FK products),
  qty (int), price_override (numeric), created_at

b2b_subscription_runs
  id, plan_id (FK b2b_subscription_plans), run_at (timestamptz),
  status (text: draft/approved/ordered/invoiced/failed/needs_attention),
  order_id (text), invoice_id (text), notes (text),
  amount (numeric), created_at
```

### Bloco D: Stock e Previsao

```
product_inventory
  id, product_id (FK products), workspace_id, stock_on_hand (int default 0),
  stock_reserved (int default 0), reorder_point (int default 5),
  supplier_lead_time_days (int default 7), updated_at, created_at

inventory_movements
  id, workspace_id, product_id, type (text: in/out/reserve/release),
  qty (int), source (text: order/erp/manual), ref_id (text),
  notes (text), created_by, created_at

demand_forecast
  id, workspace_id, product_id, period_month (date),
  forecast_qty (int), confidence (numeric),
  drivers (jsonb), created_at, updated_at
```

### RLS
- Todas as tabelas com `workspace_id`
- Tabelas `client_*` e `b2b_*`: leitura filtrada por `company_id` (security definer)
- `product_inventory`, `inventory_movements`, `demand_forecast`: leitura por workspace (admin CRM)
- Insercao/update em `b2b_subscription_plans`: validar role via security definer

### Indices
- `client_notification_settings(company_id)`
- `client_replenishment_suggestions(company_id, status)`
- `client_favorite_protocols(company_id)`
- `b2b_subscription_plans(company_id, status)`
- `b2b_subscription_runs(plan_id, status)`
- `product_inventory(product_id, workspace_id)` UNIQUE
- `inventory_movements(product_id, created_at)`
- `demand_forecast(product_id, period_month)` UNIQUE

---

## Fase 3.2 -- Alertas de Reposicao

### Paginas novas

**`/client/settings/notifications`** (`ClientNotificationSettingsPage.tsx`)
- Form para configurar preferencias: canais (email/whatsapp), frequencia, opt-in WhatsApp
- Gestao de regras de reposicao: adicionar/remover por categoria, linha, protocolo ou produto
- Toggle "Cancelar todos os alertas" em 1 clique

**`/client/replenishment`** (`ClientReplenishmentPage.tsx`)
- Lista de sugestoes de reposicao (status: new/sent/dismissed/converted)
- Cada sugestao: lista de produtos, motivo, score de confianca
- CTA: "Repor Agora" (abre carrinho pre-preenchido via CartContext)
- Historico de sugestoes anteriores

### Hooks novos
- `useNotificationSettings.ts` -- CRUD preferencias de notificacao
- `useReplenishmentRules.ts` -- CRUD regras de reposicao
- `useReplenishmentSuggestions.ts` -- fetch sugestoes + accoes (dismiss/convert)

### Edge Functions novas
- **`replenishment-generate-suggestions`** -- Analisa historico de encomendas, calcula cadencia por produto/categoria, gera sugestoes com Lovable AI (gemini-2.5-flash). Pensada para job diario/semanal.
- **`replenishment-send-email`** -- Template transacional com lista de produtos sugeridos + CTA link para carrinho pre-preenchido.
- **`replenishment-send-whatsapp`** -- Reutiliza `whatsapp-send-message` existente. Envia mensagem curta com link para reposicao. So envia se opt-in activo.
- **`replenishment-convert-to-cart`** -- Recebe `suggestion_id`, cria items no carrinho (via API), marca sugestao como "converted".

### Guardrails
- Opt-in explicito para WhatsApp (toggle + confirmacao)
- Frequencia maxima: 1x por semana (anti-spam)
- Botao "Cancelar alertas" em 1 clique
- Linguagem: "reposicoes recomendadas para manutencao do protocolo"

---

## Fase 3.3 -- Protocolos Favoritos

### Componentes / Paginas

**Widget no Dashboard** (`ClientDashboardPage.tsx`)
- Card "Protocolos Favoritos" com top 3 + link para lista completa
- CTA "Adicionar kit ao carrinho" em 1 clique

**`/client/protocols/favorites`** (`ClientFavoriteProtocolsPage.tsx`)
- Lista de protocolos marcados como favoritos
- Cada protocolo: nome, kit default (basico/avancado), botao "Adicionar ao carrinho"
- Opcao de personalizar quantidades (overrides por produto)

**Botao na pagina do protocolo** (`ClientProtocolDetailPage.tsx`)
- Botao estrela "Guardar como Favorito" no header
- Selector de kit level default ao guardar

### Hook novo
- `useFavoriteProtocols.ts` -- CRUD favoritos + overrides + toggle + isFavorite check

---

## Fase 3.4 -- Planos de Manutencao Recorrente (Assinatura B2B)

### Paginas novas

**`/client/plans`** (`ClientPlansPage.tsx`)
- Lista de planos do cliente (activos, pausados, cancelados)
- KPIs: total planos activos, valor mensal estimado, proximo ciclo
- Botao "Criar Plano"

**`/client/plans/new`** (`ClientPlanCreatePage.tsx`)
- Wizard de criacao:
  1. Escolher base: protocolo favorito, kit ou seleccao manual
  2. Ajustar produtos e quantidades
  3. Definir cadencia (mensal/bimestral/trimestral)
  4. Modo aprovacao: auto vs aprovacao obrigatoria
  5. Limite maximo por ciclo
  6. Confirmar termos
- Permissao: `client_admin` ou `client_financial`

**`/client/plans/:id`** (`ClientPlanDetailPage.tsx`)
- Detalhes do plano: produtos, cadencia, status, proximo ciclo
- Accoes: Pausar, Retomar, Cancelar, Editar
- Lista de ciclos (runs) com estado

**`/client/plans/:id/history`** (`ClientPlanHistoryPage.tsx`)
- Historico completo de execucoes do plano
- Cada run: data, estado, valor, link para encomenda/fatura

### Hooks novos
- `useSubscriptionPlans.ts` -- CRUD planos + items + runs
- `usePlanActions.ts` -- pause/resume/cancel/edit

### Edge Functions novas
- **`b2b-plan-create`** -- Valida permissoes, cria plano e items, opcionalmente cria subscription no Stripe
- **`b2b-plan-schedule-run`** -- Job periodico: verifica planos com `next_run_at <= now()`, gera draft order ou envia para aprovacao
- **`b2b-plan-generate-order`** -- Cria `order_note` a partir dos items do plano, actualiza `next_run_at`
- **`b2b-plan-generate-invoice`** -- Cria invoice via Stripe para o ciclo (associa `customer_id` a `company_id`)
- **`b2b-plan-notify-cycle`** -- Notifica cliente (email/whatsapp) sobre proximo ciclo ou ciclo executado

### Controlos
- Limites por role e por plano (`max_cycle_value`)
- Estado `needs_attention` para falhas de pagamento
- Logs de auditoria (todas as accoes registadas em `b2b_subscription_runs`)
- Cancelamento e pausa sem perda de dados

---

## Fase 3.5 -- Gestao de Stock e Previsao (Admin CRM)

### Paginas novas (Admin, nao portal cliente)

**`/dashboard/b2b/stock`** (`B2BStockPage.tsx`)
- Tabela de inventario: produto, stock on hand, reservado, disponivel, reorder point
- Filtros por categoria, linha, status
- Alertas de ruptura (stock < reorder point)
- Accoes: ajustar stock manual, registar entrada/saida
- Import CSV para actualizacao em massa

**`/dashboard/b2b/forecast`** (`B2BForecastPage.tsx`)
- Previsao de procura por produto (media movel 30/90 dias)
- Ajuste automatico com planos recorrentes (soma quantidades previstas)
- Alertas: forecast > stock disponivel
- Graficos de tendencia por produto

### Hooks novos
- `useProductInventory.ts` -- CRUD inventario + movimentos
- `useDemandForecast.ts` -- calculo de forecast + alertas

### Edge Functions novas
- **`erp-sync-inventory`** -- Conector generico: recebe payload de ERP, actualiza `product_inventory` e regista `inventory_movements`. Config por workspace (endpoint, auth, mapeamento). Preparado mas nao activado.

### Regras de Previsao (MVP)
- Media movel simples (30 e 90 dias baseado em `order_note_items` faturados)
- Soma de quantidades de planos recorrentes activos para o periodo
- Alerta quando forecast > (stock_on_hand - stock_reserved)

---

## Fase 3.6 -- Integracao na Navegacao

### `ClientLayout.tsx`
Adicionar ao menu:
- "Reposicao" (icon: RefreshCw) -> `/client/replenishment`
- "Planos" (icon: CalendarClock) -> `/client/plans` (requer `canPurchase`)
- "Definicoes" (icon: Settings) -> `/client/settings/notifications`

### `App.tsx`
Adicionar rotas no `ClientPortalRoutes`:
- `replenishment`
- `settings/notifications`
- `protocols/favorites`
- `plans`
- `plans/new`
- `plans/:id`
- `plans/:id/history`

Adicionar rotas no `CRMRoutes` (admin):
- `b2b/stock`
- `b2b/forecast`

### `supabase/config.toml`
Registar novas edge functions (9):
- `replenishment-generate-suggestions`
- `replenishment-send-email`
- `replenishment-send-whatsapp`
- `replenishment-convert-to-cart`
- `b2b-plan-create`
- `b2b-plan-schedule-run`
- `b2b-plan-generate-order`
- `b2b-plan-generate-invoice`
- `b2b-plan-notify-cycle`

---

## Resumo de Ficheiros

### Criar (Portal Cliente)
| Ficheiro | Tipo |
|---|---|
| Migracao SQL (12 tabelas + RLS + indices) | DB |
| `src/pages/client/ClientNotificationSettingsPage.tsx` | Pagina |
| `src/pages/client/ClientReplenishmentPage.tsx` | Pagina |
| `src/pages/client/ClientFavoriteProtocolsPage.tsx` | Pagina |
| `src/pages/client/ClientPlansPage.tsx` | Pagina |
| `src/pages/client/ClientPlanCreatePage.tsx` | Pagina |
| `src/pages/client/ClientPlanDetailPage.tsx` | Pagina |
| `src/pages/client/ClientPlanHistoryPage.tsx` | Pagina |
| `src/hooks/client-portal/useNotificationSettings.ts` | Hook |
| `src/hooks/client-portal/useReplenishmentRules.ts` | Hook |
| `src/hooks/client-portal/useReplenishmentSuggestions.ts` | Hook |
| `src/hooks/client-portal/useFavoriteProtocols.ts` | Hook |
| `src/hooks/client-portal/useSubscriptionPlans.ts` | Hook |
| `src/hooks/client-portal/usePlanActions.ts` | Hook |

### Criar (Admin CRM)
| Ficheiro | Tipo |
|---|---|
| `src/pages/B2BStockPage.tsx` | Pagina |
| `src/pages/B2BForecastPage.tsx` | Pagina |
| `src/hooks/useProductInventory.ts` | Hook |
| `src/hooks/useDemandForecast.ts` | Hook |

### Criar (Edge Functions)
| Ficheiro | Tipo |
|---|---|
| `supabase/functions/replenishment-generate-suggestions/index.ts` | Edge Function |
| `supabase/functions/replenishment-send-email/index.ts` | Edge Function |
| `supabase/functions/replenishment-send-whatsapp/index.ts` | Edge Function |
| `supabase/functions/replenishment-convert-to-cart/index.ts` | Edge Function |
| `supabase/functions/b2b-plan-create/index.ts` | Edge Function |
| `supabase/functions/b2b-plan-schedule-run/index.ts` | Edge Function |
| `supabase/functions/b2b-plan-generate-order/index.ts` | Edge Function |
| `supabase/functions/b2b-plan-generate-invoice/index.ts` | Edge Function |
| `supabase/functions/b2b-plan-notify-cycle/index.ts` | Edge Function |

### Editar
| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Adicionar 9 rotas (7 portal + 2 admin) |
| `src/components/client-portal/ClientLayout.tsx` | Adicionar 3 items ao menu |
| `src/pages/client/ClientDashboardPage.tsx` | Adicionar widgets Protocolos Favoritos + Planos Activos + Reposicao |
| `src/pages/client/ClientProtocolDetailPage.tsx` | Adicionar botao "Guardar como Favorito" |
| `supabase/config.toml` | Registar 9 edge functions |

### Compatibilidade
- Reutiliza `client_users.company_id` para multi-tenant (sem novas tabelas de empresas)
- Reutiliza `product_protocols` + `protocol_products` para protocolos (sem duplicar)
- Reutiliza `CartContext` para adicionar items de reposicao/plano
- Reutiliza `useClientApprovals` para aprovacao de planos
- Reutiliza `whatsapp-send-message` para notificacoes WhatsApp
- Reutiliza Stripe existente para billing B2B
- Nenhuma tabela existente e modificada estruturalmente
- RLS mantido com security definer functions

