

## Marketplace C2C — Sprint 1 Completo ✅

### O que foi implementado

#### Fase A — Migrations
- Tabela `marketplace_orders` (liga `store_orders` a sellers)
- Tabela `marketplace_wallet_entries` (ledger granular do seller)
- Colunas C2C em `store_settings` (c2c_enabled, commission, payout, etc.)
- RLS policies + índices

#### Fase B — Store Settings
- Tab "Marketplace" em Store Settings com toggle C2C, moderação, comissão, payouts, carrinho misto
- Componente `StoreC2CSettings.tsx`

#### Fase C — Integração na Loja Pública
- `StorePage.tsx` agora faz query a `c2c_listings` quando C2C está ativo
- Listings C2C misturados com produtos normais
- Badge "Vendido por [seller]" no `StoreProductCard.tsx`
- Página pública do seller: `/store/:workspaceSlug/seller/:sellerSlug`

#### Fase D — Order Split no Checkout
- `create-store-checkout` identifica items C2C via `c2c_listings`
- Cria `marketplace_orders` por seller com gross, commission e net
- Usa commission_rate do seller ou default do workspace

#### Fase E — Wallet/Ledger
- `stripe-webhook` credita wallet do seller quando order é paga
- Insere `marketplace_wallet_entries` (sale_credit + commission_debit)
- Atualiza `c2c_sellers.balance_available`
- Hooks: `useMarketplaceOrders`, `useSellerWallet`

#### Fase F — Admin Routes
- `/dashboard/marketplace/sellers` → `C2CSellersAdmin`
- `/dashboard/marketplace/listings` → `C2CContentModeration`
- `/dashboard/marketplace/orders` → `MarketplaceOrdersPage` (novo)
- `/dashboard/marketplace/payouts` → `MarketplacePayoutsPage` (novo)
- `/dashboard/marketplace/analytics` → `C2CMarketplaceAnalytics`

### Sprints Futuros
- Sprint 2: Payouts completos, disputas, kernel events
- Sprint 3: AI moderation, Command Center, Control Tower
