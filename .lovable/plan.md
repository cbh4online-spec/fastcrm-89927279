

# Auditoria Completa — Módulo Loja Online FastCRM

---

## A) INVENTÁRIO DE UI E NAVEGAÇÃO

### Rotas registadas no Router (App.tsx)

| Rota (Dashboard Admin) | Existe página? | No Menu V1? | No Menu V2? | Observação |
|---|---|---|---|---|
| `/dashboard/store-products` | ✅ StoreProductsAdminPage | ✅ | ✅ | OK |
| `/dashboard/store-orders` | ✅ StoreOrdersPage | ✅ | ✅ | OK |
| `/dashboard/store-orders/:id` | ✅ StoreOrderDetailPage | N/A (sub-rota) | N/A | OK |
| `/dashboard/store-categories` | ✅ StoreCategoriesPage | ✅ | ✅ | OK |
| `/dashboard/store-coupons` | ✅ StoreCouponsPage | ❌ **AUSENTE** | ❌ **AUSENTE** | Rota existe, página existe, **sem menu** |
| `/dashboard/store-analytics` | ✅ StoreAnalyticsPage | ❌ **AUSENTE** | ❌ **AUSENTE** | Rota existe, página existe (1073 linhas), **sem menu** |
| `/dashboard/store-settings` | ✅ StoreSettingsPage | ❌ **AUSENTE** | ❌ **AUSENTE** | Rota existe, página existe (623 linhas), **sem menu** |

Todas estão no `routes.legacy.ts` como `hidden: true`, mas **nunca foram adicionadas ao nav.v1.ts / nav.v2.ts**.

### Rotas Públicas (Storefront — `/store/*`)

| Rota | Página | Status |
|---|---|---|
| `/store/:slug` | StorePage | ✅ OK |
| `/store/:slug/product/:id` | StoreProductPage | ✅ OK |
| `/store/:slug/checkout` | StoreCheckoutPage | ✅ OK |
| `/store/:slug/success` | StoreSuccessPage | ✅ OK |
| `/store/:slug/cancel` | StoreCancelPage | ✅ OK |
| `/store/:slug/wishlist` | StoreWishlistPage | ✅ OK |
| `/store/:slug/orders` | StoreOrderHistoryPage | ✅ OK |
| `/store/:slug/downloads` | StoreDigitalAssetsPage | ✅ OK |
| `/store/:slug/loyalty` | StoreLoyaltyPage | ✅ OK |
| `/store/:slug/referrals` | StoreReferralPage | ✅ OK |
| `/store/:slug/gift-cards` | StoreGiftCardsPage | ✅ OK |

### Ficheiros a alterar para corrigir menus

- `src/config/nav.v1.ts` — grupo "Loja Online" (linhas 138-141): adicionar 3 itens
- `src/config/nav.v2.ts` — grupo "Loja Online" (linhas 136-147): adicionar 3 children

---

## B) INVENTÁRIO DO BACKEND

### Tabelas e-commerce existentes na DB

| Tabela | Status | Notas |
|---|---|---|
| `store_settings` | ✅ OK | workspace_id unique, todas as configs |
| `products` | ✅ OK | store_published, store_featured, store_category_id |
| `product_variants` | ✅ OK | attributes JSONB, price, sku |
| `product_deliverables` | ✅ OK | Digital delivery (files, portal_access) |
| `store_categories` | ✅ OK | position, is_active, image_url |
| `store_orders` | ✅ OK | FKs: contact, company, opportunity, campaign, coupon, shipping_method |
| `store_order_items` (via store_orders.items JSONB) | ⚠️ Parcial | Items são JSONB dentro de store_orders, não tabela separada |
| `store_coupons` | ✅ OK | discount_type, category_ids, valid_until |
| `store_reviews` | ✅ OK | rating, comment, product FK |
| `store_wishlist` | ✅ OK | product FK |
| `store_page_views` | ✅ OK | Analytics tracking |
| `store_abandoned_carts` | ✅ OK | contact FK, recovered_order FK |
| `store_gift_cards` | ✅ OK | code, balance, transactions |
| `store_gift_card_transactions` | ✅ OK | gift_card FK |
| `store_referral_settings` | ✅ OK | workspace unique |
| `store_referral_codes` | ✅ OK | code, workspace FK |
| `store_referrals` | ✅ OK | referee_order FK |
| `shipping_methods` | ✅ OK | workspace FK, base_price |
| `product_inventory` | ✅ OK | stock_on_hand, reorder_point |
| `inventory_movements` | ✅ OK | type, qty, source |

**Tabelas ausentes**: Nenhuma crítica em falta. O schema é bastante completo.

### Edge Functions e-commerce

| Edge Function | Existe? | Usada na UI? | Status |
|---|---|---|---|
| `create-store-checkout` | ✅ | ✅ StoreCheckoutPage | OK — Stripe checkout |
| `store-webhook` | ✅ | ✅ (Stripe webhook) | OK — processa deliverables, stock |
| `stripe-webhook` | ✅ | ✅ | OK |
| `calculate-shipping` | ✅ | ✅ StoreCheckoutPage | OK |
| `detect-abandoned-carts` | ✅ | ✅ StoreAnalyticsPage | OK |
| `store-cart-abandonment` | ✅ | ✅ | OK |
| `store-ai-advisor` | ✅ | ✅ StoreProductPage | OK |
| `store-visual-search` | ✅ | ✅ | OK |
| `store-capture-lead` | ✅ | ✅ | OK |
| `store-classify-visitor` | ✅ | ✅ | OK |
| `ai-cart-recommendations` | ✅ | ✅ | OK |
| `ai-store-offers` | ✅ | ✅ | OK |
| `process-refund` | ✅ | ✅ | OK |
| `send-order-status-notification` | ✅ | ✅ | OK |
| `send-tracking-notification` | ✅ | ✅ | OK |
| `process-product-alerts` | ✅ | ✅ | OK |
| `ai-pricing-optimizer` | ✅ | ✅ | OK |

---

## C) INVENTÁRIO FUNCIONAL

| # | Feature | Status | O que falta | Prioridade |
|---|---|---|---|---|
| 1 | Catálogo (produtos, variantes, preços, imagens, stock) | ✅ Implementado | — | — |
| 2 | Página produto (storefront) | ✅ Implementado | Reviews, zoom, video, badges, AI advisor | — |
| 3 | Carrinho (cart) | ✅ Implementado | Context-based (StoreCartProvider) | — |
| 4 | Checkout (dados, morada, envio) | ✅ Implementado | Stripe redirect, coupon, gift card, shipping | — |
| 5 | Pagamento (Stripe) | ✅ Implementado | create-store-checkout + webhook | — |
| 6 | Encomendas (admin list + detalhe) | ✅ Implementado | StoreOrdersPage + StoreOrderDetailPage | — |
| 7 | Estados (pending/paid/fulfilled/cancelled/refunded) | ✅ Implementado | Via store_orders.status + webhook | — |
| 8 | Emails transacionais | ✅ Implementado | send-order-status-notification, send-tracking | — |
| 9 | Cupões/descontos | ✅ Implementado | StoreCouponsPage existe, **MAS SEM MENU** | **P0** |
| 10 | IVA (23% PT) | ✅ Implementado | StoreVatProvider, vat_rate em store_settings | — |
| 11 | Envio (métodos, custos) | ✅ Implementado | ShippingMethodsManager em StoreSettingsPage, **MAS SEM MENU** | **P0** |
| 12 | Área cliente (wishlist, orders, downloads, loyalty, referrals, gift cards) | ✅ Implementado | 6 páginas públicas | — |
| 13 | Admin: settings da loja | ✅ Implementado | StoreSettingsPage (623 linhas), **MAS SEM MENU** | **P0** |
| 14 | Analytics da loja | ✅ Implementado | StoreAnalyticsPage (1073 linhas!), **MAS SEM MENU** | **P0** |

---

## D) DIAGNÓSTICO DE CAUSA-RAIZ

**Causa principal: #1 — Navegação/menus incompleta**

O backend, as edge functions, e os componentes UI estão **todos implementados e funcionais**. O problema é exclusivamente que 4 páginas admin nunca foram adicionadas ao menu lateral:

| Página em falta no menu | Ficheiros a corrigir |
|---|---|
| Cupões (`/dashboard/store-coupons`) | `nav.v1.ts` linha ~141, `nav.v2.ts` linha ~145 |
| Definições (`/dashboard/store-settings`) | `nav.v1.ts` linha ~141, `nav.v2.ts` linha ~145 |
| Analytics (`/dashboard/store-analytics`) | `nav.v1.ts` linha ~141, `nav.v2.ts` linha ~145 |

Não há:
- ❌ Feature flags a bloquear (moduleSlug `online-store` já existe)
- ❌ RLS a impedir acesso
- ❌ Backend incompleto
- ❌ Componentes sem bindings

---

## E) PLANO DE CORREÇÃO

### P0 — Bloqueadores (imediato)

**Adicionar 3 itens ao menu "Loja Online"** em ambos os ficheiros de navegação:

**`nav.v1.ts`** — após linha 141, adicionar:
```
{ name: "Cupões", href: "/dashboard/store-coupons", icon: Ticket, group: "Loja Online", moduleSlug: "online-store" },
{ name: "Analytics", href: "/dashboard/store-analytics", icon: BarChart3, group: "Loja Online", moduleSlug: "online-store" },
{ name: "Definições", href: "/dashboard/store-settings", icon: Settings, group: "Loja Online", moduleSlug: "online-store" },
```

**`nav.v2.ts`** — dentro do children do grupo "Loja Online" (linha ~145), adicionar:
```
{ name: "Cupões", href: "/dashboard/store-coupons", icon: Ticket, iconColor: "text-pink-500" },
{ name: "Analytics", href: "/dashboard/store-analytics", icon: BarChart3, iconColor: "text-pink-500" },
{ name: "Definições", href: "/dashboard/store-settings", icon: Settings, iconColor: "text-pink-500" },
```

### P1 — Nada identificado
O core e-commerce está completo: catálogo, checkout Stripe, encomendas, cupões, envio, IVA, emails, analytics.

### P2 — Melhorias futuras (opcionais)
- Separar `store_order_items` de JSONB para tabela relacional (melhor reporting)
- Tracking de envio integrado (número + link transportadora)
- Dashboard de métricas em tempo real (realtime subscriptions)
- Variantes de produto no checkout (seleção de cor/tamanho)

