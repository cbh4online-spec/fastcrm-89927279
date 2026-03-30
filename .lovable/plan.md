

## Evolução da Loja para Marketplace C2C — Plano

### Diagnóstico

O projecto **já possui infraestrutura C2C extensa** mas isolada da loja pública. Após análise detalhada do codebase:

**Já existe (não precisa ser recriado):**

| Componente | Tabela/Ficheiro |
|---|---|
| Sellers com onboarding, status, comissão | `c2c_sellers` (30+ campos incluindo balance, iban, stripe) |
| Listings com moderação | `c2c_listings` (moderation_status, condition, photos) |
| Comissões | `c2c_commissions` (sale_amount, commission_amount, seller_amount) |
| Transações | `c2c_transactions` (amount_fee, amount_seller, escrow) |
| Escrow | `c2c_escrow` |
| Payouts | `c2c_payouts` (amount, status, method, paid_at) |
| Disputas | `c2c_disputes` |
| Config marketplace | `c2c_marketplace_config` |
| Admin sellers (839 linhas) | `C2CSellersAdmin.tsx` |
| Analytics marketplace | `C2CMarketplaceAnalytics.tsx` |
| Moderação | `C2CModerationPage.tsx`, `C2CContentModeration.tsx` |
| Edge functions | `marketplace-attribute-sale`, `marketplace-payout-execute`, `create-c2c-checkout` |
| Hooks completos | `useC2CSellers`, `useC2CListings`, `useC2CSellerAdmin`, `useMarketplaceAnalytics` |
| 30+ páginas C2C | Onboarding, boost, favorites, messages, orders, etc. |
| Verificação de sellers | `C2CVerificationPage`, `c2c_verification_requests` |
| Tiers de sellers | `C2CSellerTiersPage` |

**O que falta (gap real):**

1. **Wallet/Ledger granular** — Não existe tabela de movimentos; `c2c_sellers` tem `balance_available`/`balance_pending` mas sem histórico
2. **Integração na loja pública** — Listings C2C não aparecem na StorePage; store só mostra `products`
3. **Order split no checkout** — `create-store-checkout` não identifica items de seller nem cria `marketplace_orders`
4. **Tabela `marketplace_orders`** — Ligação entre `store_orders` e sellers não existe
5. **Tab C2C no Store Settings** — Sem configuração centralizada
6. **Eventos kernel** — Sem tracking marketplace no kernel
7. **Rotas unificadas** — C2C vive em `/dashboard/c2c/`, pedido é `/dashboard/marketplace/`

### Plano de Implementação (por fases)

Dado o volume (14 fases, ~50 ficheiros), proponho dividir em **3 sprints** para manter builds funcionais. Este plano cobre o Sprint 1 — as fundações que desbloqueiam tudo o resto.

---

### SPRINT 1 — Fundações (este plano)

#### Fase A — Migration: `marketplace_orders` + `marketplace_wallet_entries`

```sql
-- 1. marketplace_orders (liga store_orders a sellers)
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  store_order_id uuid NOT NULL REFERENCES store_orders(id),
  seller_id uuid NOT NULL REFERENCES c2c_sellers(id),
  listing_id uuid REFERENCES c2c_listings(id),
  gross_amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. marketplace_wallet_entries (ledger do seller)
CREATE TABLE public.marketplace_wallet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  seller_id uuid NOT NULL REFERENCES c2c_sellers(id),
  entry_type text NOT NULL, -- sale_credit, commission_debit, refund_debit, payout_debit, adjustment
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  reference_type text, -- marketplace_order, payout, refund
  reference_id uuid,
  balance_after numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_wallet_entries ENABLE ROW LEVEL SECURITY;

-- Policies (workspace members can read, service_role writes)
CREATE POLICY "workspace_read_marketplace_orders" ON public.marketplace_orders
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workspace_read_wallet_entries" ON public.marketplace_wallet_entries
  FOR SELECT TO authenticated USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
```

#### Fase B — Store Settings: Tab Marketplace C2C

**Editar** `store_settings` (migration) para adicionar campos:
- `c2c_enabled boolean DEFAULT false`
- `c2c_seller_approval_required boolean DEFAULT true`
- `c2c_listing_moderation_required boolean DEFAULT true`
- `c2c_default_commission_rate numeric DEFAULT 10`
- `c2c_payout_minimum_amount numeric DEFAULT 25`
- `c2c_payout_manual_mode boolean DEFAULT true`
- `c2c_allow_mixed_cart boolean DEFAULT true`

**Criar** componente `StoreC2CSettings.tsx` com formulário para estes campos.

**Editar** a página de Store Settings para incluir nova tab "Marketplace C2C".

#### Fase C — Integração na Loja Pública

**Editar** `StorePage.tsx`:
- Quando `c2c_enabled`, fazer query adicional a `c2c_listings` (status=active, moderation_status=approved)
- Mostrar listings C2C misturados com produtos normais
- Badge "Vendido por [seller]" em cada card C2C
- Filtro "Marketplace" na sidebar

**Criar** `StoreSellerPage.tsx` — Página pública do seller:
- Rota: `/store/:workspaceSlug/seller/:sellerSlug`
- Avatar, bio, rating, listings do seller

**Editar** `StoreProductCard.tsx` — Mostrar badge de seller quando item é C2C.

#### Fase D — Order Split no Checkout

**Editar** `create-store-checkout/index.ts`:
- Identificar items com `seller_id` (via `c2c_listings`)
- Após criação do `store_order`, criar `marketplace_orders` por seller
- Calcular `gross_amount`, `commission_amount` (via `c2c_sellers.commission_rate` ou default), `net_amount`

**Criar** hook `useMarketplaceOrders.ts` — Query `marketplace_orders` por workspace.

#### Fase E — Wallet/Ledger

**Criar** hook `useSellerWallet.ts`:
- `useWalletEntries(sellerId)` — histórico do ledger
- `useSellerBalance(sellerId)` — saldo actual

**Editar** `stripe-webhook/index.ts` (ou criar `marketplace-process-sale`):
- Quando `store_order` é pago, para cada `marketplace_order`:
  1. Inserir `marketplace_wallet_entries` (sale_credit com net_amount)
  2. Inserir `marketplace_wallet_entries` (commission_debit com commission_amount)
  3. Atualizar `c2c_sellers.balance_available`

#### Fase F — Rotas Unificadas + Admin Dashboard

**Criar** rotas marketplace em `/dashboard/marketplace/`:
- `/dashboard/marketplace/sellers` → reutiliza `C2CSellersAdmin`
- `/dashboard/marketplace/listings` → reutiliza `C2CContentModeration`
- `/dashboard/marketplace/payouts` → nova página com tabela de `c2c_payouts`
- `/dashboard/marketplace/orders` → nova página com `marketplace_orders`
- `/dashboard/marketplace/analytics` → reutiliza `C2CMarketplaceAnalytics`

**Criar** `MarketplaceRoutes.tsx` com estas rotas.

#### Fase G — Eventos Kernel

**Editar** edge functions relevantes para emitir:
- `MARKETPLACE.SELLER_CREATED` / `APPROVED`
- `MARKETPLACE.LISTING_SUBMITTED` / `APPROVED`
- `MARKETPLACE.ORDER_CREATED`
- `MARKETPLACE.WALLET_UPDATED`
- `MARKETPLACE.PAYOUT_REQUESTED` / `PAID`

---

### Ficheiros

| Acção | Ficheiro |
|---|---|
| Migration | `marketplace_orders`, `marketplace_wallet_entries`, `store_settings` cols |
| Criar | `src/components/store/StoreC2CSettings.tsx` |
| Criar | `src/pages/store/StoreSellerPage.tsx` |
| Criar | `src/hooks/useMarketplaceOrders.ts` |
| Criar | `src/hooks/useSellerWallet.ts` |
| Criar | `src/routes/MarketplaceRoutes.tsx` |
| Criar | `src/pages/dashboard/marketplace/MarketplacePayoutsPage.tsx` |
| Criar | `src/pages/dashboard/marketplace/MarketplaceOrdersPage.tsx` |
| Editar | `src/pages/store/StorePage.tsx` (integrar listings C2C) |
| Editar | `src/components/store/StoreProductCard.tsx` (badge seller) |
| Editar | `supabase/functions/create-store-checkout/index.ts` (order split) |
| Editar | `supabase/functions/stripe-webhook/index.ts` (wallet credit) |
| Editar | Store Settings page (nova tab C2C) |
| Editar | App router (adicionar MarketplaceRoutes) |
| Editar | Edge functions (kernel events) |

### Critérios de Aceitação

1. Settings C2C guardam e carregam correctamente
2. Listings C2C aparecem na loja pública com badge seller
3. Checkout cria `marketplace_orders` por seller
4. Pagamento credita wallet do seller
5. Admin vê sellers, listings, payouts e orders em `/dashboard/marketplace/`
6. Eventos kernel são emitidos
7. Build funcional sem erros

### Riscos

- **Volume**: ~15 ficheiros, 3 migrations, 2 edge functions editadas — pode ser necessário dividir em 2-3 mensagens de implementação
- **Mixed cart**: Stripe line_items precisam de metadata para identificar seller items
- **Wallet consistency**: Operações de saldo devem ser atómicas (transaction SQL)
- **RLS**: Sellers só devem ver os seus próprios wallet entries

### Sprints Futuros (não neste plano)

- **Sprint 2**: Payouts completos (request → approve → pay → ledger), seller public page avançada, disputas integradas
- **Sprint 3**: AI moderation, Command Center integration, Control Tower metrics, share C2C vs store

