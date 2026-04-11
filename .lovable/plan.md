

## Plano: Sistema de Créditos de Impulso C2C

### Contexto
Atualmente, o boost de anúncios redireciona para Stripe checkout. O pedido é substituir por um sistema de **carteira interna** onde o vendedor compra créditos e gasta-os em **destaque no topo** + **CPC (custo por clique)**.

### Arquitectura

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Comprar Créditos│────▶│  Stripe Checkout  │────▶│ Webhook credita │
│  (flexível)      │     │  (edge function)  │     │ wallet interna  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│  Gastar créditos │◀───────────────────────────│ c2c_boost_wallet│
│  Destaque / CPC  │                            │ (por seller)    │
└─────────────────┘                            └─────────────────┘
```

### 1. Base de Dados (3 tabelas novas)

- **c2c_boost_wallets** — saldo de créditos por vendedor/workspace
  - `seller_id`, `workspace_id`, `balance` (integer), RLS por workspace membership
- **c2c_boost_transactions** — ledger de movimentos (compra, gasto, reembolso)
  - `wallet_id`, `type` (purchase/spend/refund), `amount`, `listing_id`, `description`, `created_at`
- **c2c_boost_config** — configuração de preços (preço unitário do crédito, custo destaque por dia, custo CPC)
  - Valores default: 0.50€/crédito, 5 créditos/dia destaque, 1 crédito/clique

Actualizar `c2c_sponsored_listings` com campo `boost_type` (highlight/cpc/both) e `daily_cpc_budget`.

### 2. Edge Functions

- **create-boost-credit-checkout** — cria sessão Stripe para compra flexível de N créditos
- Actualizar **webhook existente** (ou criar handler) para creditar a wallet após pagamento confirmado

### 3. Hook `useBoostWallet`

- `balance` — saldo actual
- `transactions` — histórico
- `buyCredits(amount)` — abre checkout Stripe
- `spendCredits(listingId, type, days/budget)` — debita wallet e activa boost
- `canAfford(cost)` — verificação rápida

### 4. UI — Página C2CSellerBoost refactored

- **Secção Carteira** — saldo actual + botão "Comprar Créditos" com input flexível (quantidade + preço total calculado)
- **Secção Destacar** — para cada anúncio, escolher tipo (Destaque / CPC / Ambos), duração para destaque, orçamento diário para CPC, com custo em créditos calculado em tempo real
- **Histórico** — tabela de transacções da wallet

### 5. Lógica CPC

- No `C2CListingDetail`, ao registar clique em anúncio patrocinado CPC, debitar 1 crédito da wallet do vendedor
- Quando saldo esgota, desactivar boost automaticamente

### 6. Segurança

- RLS em todas as tabelas novas (scoped por workspace + seller)
- Débitos via função `SECURITY DEFINER` com `FOR UPDATE` lock para evitar race conditions
- Edge function valida JWT + workspace membership

### Ficheiros a criar/editar

| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Criar 3 tabelas + RPC `spend_boost_credits` |
| `src/hooks/useBoostWallet.ts` | Novo hook |
| `src/pages/c2c/C2CSellerBoost.tsx` | Refactor completo |
| `supabase/functions/create-boost-credit-checkout/index.ts` | Nova edge function |
| `src/hooks/useC2CBoost.ts` | Adaptar para usar wallet |
| `src/pages/c2c/C2CListingDetail.tsx` | Adicionar lógica CPC no clique |

### Critérios de Aceitação

- Vendedor pode comprar quantidade flexível de créditos via Stripe
- Vendedor vê saldo e histórico de transacções
- Pode activar destaque (X créditos/dia) ou CPC (1 crédito/clique) ou ambos
- Custo calculado em tempo real antes de confirmar
- Boost desactiva automaticamente quando créditos esgotam
- Toda a lógica financeira protegida com locks e RLS

