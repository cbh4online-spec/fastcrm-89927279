

## Marketplace C2C — Sprint 2: Payouts, Moderação, Kernel Events, Analytics

### Estado Actual

Sprint 1 concluído: tabelas `marketplace_orders` + `marketplace_wallet_entries`, settings C2C, integração na loja pública, order split no checkout, wallet credit via stripe-webhook, rotas admin unificadas.

**Gaps identificados para completar as Fases A-N:**

| Gap | Detalhe |
|-----|---------|
| **Tabela `marketplace_payouts`** | O spec pede tabela dedicada; usamos `c2c_payouts` que tem schema diferente (user_id vs seller_id, campos de affiliate). Precisamos de tabela nova ou migration para alinhar. |
| **Payouts backoffice completo** | `MarketplacePayoutsPage` é read-only; falta: seller pedir payout, admin aprovar, marcar pago, debitar wallet |
| **Kernel events** | Zero eventos `MARKETPLACE.*` emitidos no frontend ou edge functions (apenas `AFFILIATE_ATTRIBUTED` e `SALE_COMPLETED` no c2c-webhook antigo) |
| **Risk flags** | `c2c_sellers` não tem campos `suspected_fraud`, `dispute_open`, `excessive_cancellations` |
| **Analytics com marketplace_orders** | `useMarketplaceAnalytics` usa `c2c_orders` (tabela antiga), não `marketplace_orders`. Faltam métricas: GMV, comissão total, share C2C vs store, top sellers |
| **Moderação unificada** | `C2CModerationPage` usa `c2c_moderation_queue`; precisa de incluir acções de bloquear seller e rejeitar listing com motivo |

### Plano Sprint 2

#### 1. Migration: `marketplace_payouts` + risk flags

```sql
CREATE TABLE public.marketplace_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  seller_id uuid NOT NULL REFERENCES c2c_sellers(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'EUR',
  status text DEFAULT 'requested', -- requested/approved/paid/failed/cancelled
  payout_method text,
  notes text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- RLS: workspace members can read

ALTER TABLE public.c2c_sellers
  ADD COLUMN IF NOT EXISTS suspected_fraud boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_open boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS excessive_cancellations boolean DEFAULT false;
```

#### 2. Payouts backoffice completo

**Criar** edge function `marketplace-manage-payout/index.ts`:
- Acções: `request` (seller pede, valida saldo ≥ payout_minimum), `approve`, `mark_paid` (debita wallet + insere `marketplace_wallet_entries` tipo `payout_debit`), `cancel`
- Emite kernel events `MARKETPLACE.PAYOUT_REQUESTED` e `MARKETPLACE.PAYOUT_PAID`

**Editar** `MarketplacePayoutsPage.tsx`:
- Botões de acção: Aprovar, Marcar Pago, Cancelar
- Invoca edge function
- Mostra seller name (join com `c2c_sellers`)
- KPI cards: total pendente, total pago este mês

#### 3. Kernel events no frontend e edge functions

**Editar** ficheiros que já fazem operações marketplace para emitir eventos:
- `create-store-checkout` → `MARKETPLACE.ORDER_CREATED`
- `stripe-webhook` (secção wallet) → `MARKETPLACE.WALLET_UPDATED`
- `C2CSellersAdmin` (approve seller) → `MARKETPLACE.SELLER_APPROVED`
- `C2CContentModeration` (approve listing) → `MARKETPLACE.LISTING_APPROVED`

Usar `emitKernelEvent` no frontend e fetch interno nas edge functions (padrão existente).

#### 4. Analytics com marketplace_orders

**Editar** `useMarketplaceAnalytics.ts`:
- Adicionar queries a `marketplace_orders` para: GMV (sum gross_amount), comissão total (sum commission_amount), payout pendente
- Top sellers por GMV
- Share C2C vs store (comparar marketplace_orders vs store_orders sem seller)

**Editar** `C2CMarketplaceAnalytics.tsx`:
- Adicionar KPI cards: GMV, Comissão, Payout Pendente, Share C2C
- Tabela top sellers

#### 5. Moderação: risk flags + acções

**Editar** `C2CSellersAdmin.tsx`:
- Mostrar badges de risk flags (`suspected_fraud`, `dispute_open`)
- Toggle para marcar/desmarcar flags
- Acção de bloquear seller (status → blocked)

**Editar** `C2CModerationPage.tsx` ou `C2CContentModeration.tsx`:
- Acção "Rejeitar com motivo" (input de texto ao rejeitar listing)
- Mostrar motivo no histórico de revisões

### Ficheiros

| Acção | Ficheiro |
|-------|----------|
| Migration | `marketplace_payouts`, `c2c_sellers` risk cols |
| Criar | `supabase/functions/marketplace-manage-payout/index.ts` |
| Editar | `src/pages/dashboard/marketplace/MarketplacePayoutsPage.tsx` |
| Editar | `src/hooks/useMarketplaceAnalytics.ts` |
| Editar | `src/pages/c2c/C2CMarketplaceAnalytics.tsx` |
| Editar | `supabase/functions/create-store-checkout/index.ts` (kernel event) |
| Editar | `supabase/functions/stripe-webhook/index.ts` (kernel event) |
| Editar | `src/pages/c2c/C2CSellersAdmin.tsx` (risk flags + kernel) |
| Editar | `src/pages/c2c/C2CModerationPage.tsx` (rejeitar com motivo) |
| Editar | `.lovable/plan.md` |

### Critérios de Aceitação

1. Seller pode pedir payout (validando saldo mínimo)
2. Admin pode aprovar e marcar payout como pago
3. Wallet é debitada ao pagar payout
4. Risk flags visíveis e editáveis no admin de sellers
5. Rejeição de listing com motivo funcional
6. Kernel events emitidos em operações marketplace
7. Analytics mostram GMV, comissão, top sellers, share C2C
8. Build funcional

