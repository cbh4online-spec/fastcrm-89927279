

# Módulo de Renovações — Plano de Implementação

## Contexto Existente

O projeto já possui:
- **`subscriptions`** — subscrições simples (MRR, frequência, status, datas)
- **`subscription_events`** — eventos de subscrição
- **`client_contracts`** — contratos do portal cliente (título, valor, auto_renew, status)
- **`check-renewals`** edge function — alertas básicos de renovação
- **`consumption_logs`** + **`useConsumptionLogs`** — registo de consumo por produto adquirido

O módulo pedido é substancialmente mais rico. Vamos construir por fases incrementais, priorizando a **infraestrutura de dados** e depois a **UI**.

---

## Fase 1 — Modelo de Dados (Migration SQL)

### Novas tabelas

**`renewal_contracts`** — objeto central de renovação
- `id`, `workspace_id`, `company_id`, `contact_id` (nullable)
- `source_type` (enum: proposal, order, opportunity, manual)
- `source_id` (nullable text)
- `status` (enum: active, paused, cancelled, expired)
- `billing_type` (enum: invoice, stripe, external)
- `currency` (default EUR), `payment_terms_days`
- `start_date`, `next_renewal_date`, `renewal_interval` (enum: monthly, yearly, custom)
- `auto_renew` (bool), `owner_user_id`, `notes`, `health_score` (int 0-100, default 100)
- `created_at`, `updated_at`

**`renewal_items`** — itens dentro do contrato
- `id`, `workspace_id`, `contract_id` (FK renewal_contracts)
- `item_type` (enum: domain, software_license, hours_pack, retainer, subscription)
- `product_id` (nullable FK products)
- `name`, `qty`, `unit_price`
- `pricing_model` (enum: fixed, per_seat, per_unit, usage, hybrid)
- `renewal_interval`, `next_renewal_date`, `end_date`
- `grace_period_days` (default 7)
- `status` (enum: active, pending_renewal, overdue, cancelled, expired)
- `meta_json` (jsonb) — dados específicos por tipo (auth_code, seats, hours_included, hours_remaining, etc.)

**`renewal_usage_ledger`** — consumo (horas, créditos)
- `id`, `workspace_id`, `contract_id`, `renewal_item_id`
- `usage_type` (enum: hours, credits, seats_addon)
- `amount` (numeric), `unit` (text)
- `source_type` (task, call, meeting, manual), `source_id`
- `description`, `created_by`, `created_at`

**`renewal_events`** — timeline/auditoria
- `id`, `workspace_id`, `contract_id`
- `event_type` (enum: created, renewal_due, renewed, invoice_sent, payment_received, overdue, consumption_logged, paused, cancelled)
- `payload_json` (jsonb), `created_at`

### RLS

Todas as tabelas: `workspace_id = workspace_id` do membro autenticado (via função existente `is_workspace_member`). Super admin bypass via `is_super_admin`.

### Enums a criar
- `renewal_source_type`, `renewal_contract_status`, `renewal_billing_type`, `renewal_interval_type`, `renewal_item_type`, `renewal_pricing_model`, `renewal_item_status`, `renewal_usage_type`, `renewal_event_type`

---

## Fase 2 — Hooks e Types (Frontend)

### Ficheiros novos
- **`src/types/renewal.ts`** — interfaces TypeScript para todos os tipos
- **`src/hooks/useRenewals.ts`** — CRUD de `renewal_contracts` + `renewal_items`, queries com joins, filtros, mutations
- **`src/hooks/useRenewalUsage.ts`** — ledger de consumo: listar, criar, stats (horas restantes, percentagem)
- **`src/hooks/useRenewalEvents.ts`** — timeline de eventos

---

## Fase 3 — UI (Páginas e Componentes)

### Navegação
- Adicionar "Renovações" ao grupo "Vendas" em `nav.v2.ts` e `nav.v1.ts`
- Rota: `/dashboard/renewals` (lista) e `/dashboard/renewals/:id` (detalhe)

### Página Lista (`src/pages/RenewalsPage.tsx`)
- Tabela com: cliente, tipo, próxima renovação, status, MRR equivalente, health score, responsável
- Filtros: próximos 30 dias, overdue, packs baixos, por owner
- Badge colorido de health score
- Botão "Novo Contrato"

### Página Detalhe (`src/pages/RenewalDetailPage.tsx`)
- **5 tabs**:
  1. **Overview** — datas, valores, regras, health score visual
  2. **Items** — lista de itens (domínios, licenças, packs), inline edit
  3. **Usage** — ledger de consumo + formulário rápido "Registar consumo"
  4. **Billing** — faturas associadas, próximos pagamentos
  5. **Timeline** — `renewal_events` em formato cronológico

### Quick Actions (no detalhe)
- "Registar consumo" (dialog com tipo, quantidade, descrição)
- "Renovar agora" (gera proposta/fatura)
- "Pausar" / "Cancelar" (muda status + cria evento)
- "Criar proposta de renovação"

### Formulário de criação (`CreateRenewalDialog.tsx`)
- Selecionar empresa/contacto
- Definir tipo de billing, intervalo, auto_renew
- Adicionar itens com tipo, preço, quantidade
- Source linkage (proposta, oportunidade, etc.)

---

## Fase 4 — Edge Functions e Automações

### `renewals-scheduler` (cron diário)
- Detecta itens com `next_renewal_date` nos próximos 30 dias
- Cria `renewal_events` (renewal_due) e notifications
- Muda status para `pending_renewal` se <= 7 dias
- Muda para `overdue` se passada a data + grace_period
- Alerta packs de horas abaixo de 20%

### `renewals-log-usage`
- Recebe `renewal_item_id`, `amount`, `source_type`, `description`
- Insere no `renewal_usage_ledger`
- Recalcula `hours_remaining` no `meta_json` do item
- Dispara alerta se abaixo do threshold (20%)

### `renewals-health-score`
- Calcula score (0-100) baseado em:
  - Proximidade da renovação (peso 25%)
  - Atraso no pagamento (peso 25%)
  - Consumo vs saldo em packs (peso 25%)
  - Histórico de renovações (peso 25%)
- Grava no `renewal_contracts.health_score`

---

## Fase 5 — Inteligência e Integração

### Integração com Propostas/Vendas
- Quando proposta marcada "Ganha" com produtos tipo domain/license/hours_pack: sugerir criação de contrato de renovação
- Copiar itens e datas automaticamente

### Alertas automáticos
- 30/15/7/1 dias antes da renovação
- Overdue 1/3/7/15 dias
- Pack abaixo de 20%
- Pack expira em 15 dias

---

## Ficheiros a criar/editar

| Ficheiro | Ação |
|----------|------|
| Migration SQL (4 tabelas + enums + RLS) | Criar |
| `src/types/renewal.ts` | Criar |
| `src/hooks/useRenewals.ts` | Criar |
| `src/hooks/useRenewalUsage.ts` | Criar |
| `src/hooks/useRenewalEvents.ts` | Criar |
| `src/pages/RenewalsPage.tsx` | Criar |
| `src/pages/RenewalDetailPage.tsx` | Criar |
| `src/components/renewals/CreateRenewalDialog.tsx` | Criar |
| `src/components/renewals/RenewalItemsList.tsx` | Criar |
| `src/components/renewals/UsageLedger.tsx` | Criar |
| `src/components/renewals/RenewalTimeline.tsx` | Criar |
| `src/components/renewals/LogUsageDialog.tsx` | Criar |
| `src/components/renewals/RenewalHealthBadge.tsx` | Criar |
| `src/config/nav.v2.ts` | Editar (adicionar Renovações) |
| `src/config/nav.v1.ts` | Editar |
| `src/App.tsx` (ou router) | Editar (adicionar rotas) |
| `supabase/functions/renewals-scheduler/index.ts` | Criar |
| `supabase/functions/renewals-log-usage/index.ts` | Criar |
| `supabase/functions/renewals-health-score/index.ts` | Criar |

## Abordagem de Implementação

Dado o volume, vou implementar em **3 blocos sequenciais**:
1. **Bloco 1**: Migration + Types + Hooks + Navegação + Rotas
2. **Bloco 2**: Páginas (lista + detalhe com tabs) + Componentes UI
3. **Bloco 3**: Edge Functions (scheduler, usage, health score) + integração com propostas

Cada bloco produz funcionalidade testável.

