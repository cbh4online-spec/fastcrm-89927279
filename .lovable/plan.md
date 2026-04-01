

## P0 — Consolidação Estrutural do Módulo de Loja Online

### Diagnóstico Actual

| Ficheiro | Linhas | Problema |
|----------|--------|----------|
| `StorePage.tsx` | 424 | Monolítico: SEO, hero, categorias, deals, filtros, C2C, compare, AI advisor tudo inline |
| `StoreCheckoutPage.tsx` | 648 | Monolítico: lead capture, shipping, cupões, gift cards, cálculos, validação, UI tudo junto |
| `StoreAnalyticsPage.tsx` | 1073 | Monolítico: 8 tabs com charts, KPIs, tabelas, heatmaps tudo num ficheiro |
| `StoreSettingsPage.tsx` | 629 | Monolítico: branding, fulfillment, loyalty, referrals, marketplace, FAQs tudo junto |
| `StoreProductsAdminPage.tsx` | 574 | Mistura gestão de catálogo com pricing intelligence e sugestões IA |

Componentes store: 40+ ficheiros em `src/components/store/` + 18 em `sections/`. Organização plana sem subdomínios.

Checkout: validação inline sem schema, sem prevenção de double-submit real, cálculos de preço dispersos.

### Plano de Execução — 6 Batches

---

**B1 — Extrair StorePage em submódulos**

Criar `src/components/store/storefront/`:
- `StoreSeoHead.tsx` — Helmet + JSON-LD (linhas 168-191)
- `StoreHeroSections.tsx` — compõe hero, trust, category grid, best sellers, new arrivals, deals, featured, CTA (linhas 211-278)
- `StoreCatalogSection.tsx` — sidebar + product grid + infinite scroll + empty state (linhas 281-390)
- `StoreC2CIntegration.tsx` — C2C listings query + mapping (linhas 87-136)

Refatorar `StorePage.tsx` para ~80 linhas: resolve workspace, carrega dados, compõe submódulos.

---

**B2 — Extrair StoreCheckoutPage em submódulos**

Criar `src/components/store/checkout/`:
- `CheckoutLeadStep.tsx` — form nome + telefone + validação (linhas 393-441)
- `CheckoutPaymentStep.tsx` — email + shipping + submit (linhas 443-535)
- `CheckoutShippingSection.tsx` — CTT options + radio (linhas 480-519)
- `CheckoutCouponSection.tsx` — apply/remove coupon (linhas 566-594)
- `CheckoutGiftCardSection.tsx` — apply/remove gift card (linhas 597-607)
- `CheckoutSummaryCard.tsx` — order summary sidebar (linhas 540-641)
- `useCheckoutPricing.ts` — hook com cálculos: discount, shipping, gift card, finalTotal
- `useCheckoutForm.ts` — hook com form state, validação via zod schema, captureLead, handleSubmit
- `checkoutSchema.ts` — zod schemas para step1 (nome + telefone) e step2 (email)

Adicionar prevenção de double-submit com `isProcessingRef`.

Refatorar `StoreCheckoutPage.tsx` para ~100 linhas: resolve workspace, compõe steps.

---

**B3 — Extrair StoreAnalyticsPage em tab components**

Criar `src/components/store/analytics/`:
- `StoreAnalyticsShell.tsx` — header + period selector + tabs container
- `StoreOverviewTab.tsx` — KPIs + revenue/orders chart + status breakdown
- `StoreSalesTab.tsx` — daily revenue, heatmap, checkout funnel
- `StoreProductsTab.tsx` — top products table
- `StoreCustomersTab.tsx` — customer metrics + LTV
- `StoreCouponsTab.tsx` — coupon metrics table
- `StoreInventoryTab.tsx` — inventory alerts
- `StoreFinancialTab.tsx` — revenue breakdown, bundle revenue

Mover `KPICard` helper para componente reutilizável.

Refatorar `StoreAnalyticsPage.tsx` para ~60 linhas.

---

**B4 — Extrair StoreSettingsPage em secções independentes**

Criar `src/components/store-settings/sections/`:
- `StoreIdentitySettings.tsx` — nome, slug, domain, descrição
- `StoreBrandingSettings.tsx` — logo, banner, cores, upload, IA de cores/banner
- `StoreNotificationSettings.tsx` — email, display toggles
- `StoreFulfillmentSettings.tsx` — shipping methods (já existe `ShippingMethodsManager`)
- `StoreGrowthSettings.tsx` — loyalty, referrals, offers, gift cards, FAQs (compõe managers existentes)
- `StoreMarketplaceSettings.tsx` — C2C settings (já existe `StoreC2CSettings`)

Refatorar `StoreSettingsPage.tsx` para ~80 linhas: tabs + secções.

---

**B5 — Separar catálogo de pricing intelligence no backoffice**

Refatorar `StoreProductsAdminPage.tsx`:
- Extrair `ProductCatalogTable.tsx` — tabela de produtos com publish/feature/sort/edit
- Extrair `ProductPricingPanel.tsx` — price suggestions, competitor pricing, margin analysis
- Manter ambos como tabs/secções na mesma página mas com separação visual clara
- Utilizador pode gerir catálogo sem ver pricing intelligence por defeito

---

**B6 — Hardening do checkout + SEO**

Checkout:
- Adicionar zod schemas em `checkoutSchema.ts` para validação completa
- Validar cart items antes de iniciar (productId, quantity > 0, price > 0)
- Garantir `wsId` resolvido antes de permitir submit
- Garantir total final nunca negativo (já existe via `moneyMax`)
- Adicionar `disabled` ao botão durante processing (já existe, confirmar ref guard)

SEO:
- Validar `canonical` em `StoreProductPage.tsx`
- Confirmar `og:image` fallback quando produto não tem imagem
- Garantir `noindex` em checkout, success, cancel

---

### Ficheiros a Criar

| Ficheiro | Batch |
|----------|-------|
| `src/components/store/storefront/StoreSeoHead.tsx` | B1 |
| `src/components/store/storefront/StoreHeroSections.tsx` | B1 |
| `src/components/store/storefront/StoreCatalogSection.tsx` | B1 |
| `src/components/store/storefront/StoreC2CIntegration.tsx` | B1 |
| `src/components/store/checkout/CheckoutLeadStep.tsx` | B2 |
| `src/components/store/checkout/CheckoutPaymentStep.tsx` | B2 |
| `src/components/store/checkout/CheckoutShippingSection.tsx` | B2 |
| `src/components/store/checkout/CheckoutCouponSection.tsx` | B2 |
| `src/components/store/checkout/CheckoutGiftCardSection.tsx` | B2 |
| `src/components/store/checkout/CheckoutSummaryCard.tsx` | B2 |
| `src/components/store/checkout/useCheckoutPricing.ts` | B2 |
| `src/components/store/checkout/useCheckoutForm.ts` | B2 |
| `src/components/store/checkout/checkoutSchema.ts` | B2 |
| `src/components/store/analytics/StoreAnalyticsShell.tsx` | B3 |
| `src/components/store/analytics/StoreOverviewTab.tsx` | B3 |
| `src/components/store/analytics/StoreSalesTab.tsx` | B3 |
| `src/components/store/analytics/StoreProductsTab.tsx` | B3 |
| `src/components/store/analytics/StoreCustomersTab.tsx` | B3 |
| `src/components/store/analytics/StoreCouponsTab.tsx` | B3 |
| `src/components/store/analytics/StoreInventoryTab.tsx` | B3 |
| `src/components/store/analytics/StoreFinancialTab.tsx` | B3 |
| `src/components/store-settings/sections/StoreIdentitySettings.tsx` | B4 |
| `src/components/store-settings/sections/StoreBrandingSettings.tsx` | B4 |
| `src/components/store-settings/sections/StoreNotificationSettings.tsx` | B4 |
| `src/components/store-settings/sections/StoreFulfillmentSettings.tsx` | B4 |
| `src/components/store-settings/sections/StoreGrowthSettings.tsx` | B4 |
| `src/components/store/admin/ProductCatalogTable.tsx` | B5 |
| `src/components/store/admin/ProductPricingPanel.tsx` | B5 |

### Ficheiros a Refatorar (reduzir significativamente)

| Ficheiro | De | Para |
|----------|----|------|
| `StorePage.tsx` | 424 | ~80 |
| `StoreCheckoutPage.tsx` | 648 | ~100 |
| `StoreAnalyticsPage.tsx` | 1073 | ~60 |
| `StoreSettingsPage.tsx` | 629 | ~80 |
| `StoreProductsAdminPage.tsx` | 574 | ~120 |

### Sem alterações a

- Rotas (`StoreRoutes.tsx`)
- Schema de base de dados
- Edge functions
- Componentes existentes em `sections/` e `store-settings/`

### Critérios de Aceitação P0

- Nenhuma rota quebrada
- Nenhuma funcionalidade removida
- Páginas monolíticas decompostas em submódulos < 150 linhas
- Checkout com validação via zod schema
- Settings com tabs independentes e save previsível
- Catálogo separado visualmente de pricing intelligence
- SEO validado em storefront e product page

### Fora de Scope (P1/P2)

- Abandoned cart lifecycle (P1)
- Order fulfillment avançado (P1)
- Loyalty/referrals como motor de retenção (P1)
- Store intelligence / health scores (P2)
- Personalização / recomendações (P2)
- Pricing advisor avançado (P2)

