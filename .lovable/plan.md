

## B5 + B6 — Separação Catálogo vs Pricing Intelligence + Hardening Checkout/SEO

### Diagnóstico

| Área | Estado | Problema |
|------|--------|----------|
| **StoreProductsAdminPage.tsx** | 574 linhas | Mistura gestão de catálogo (publish/featured/sort/edit) com pricing intelligence (sugestões IA, comparação concorrência, bulk price update) no mesmo ficheiro |
| **StoreProductPage.tsx** | 734 linhas | Monolítico — gallery, buy box, description, specs, reviews, price comparison, cross-sell tudo inline. SEO já existe (OG + JSON-LD Product) mas falta BreadcrumbList structured data |
| **Checkout (store)** | Bom — já decomposto em steps/hooks | Faltam: trust badges no checkout da loja, SEO noindex já presente, mas sem tratamento de erros robusto no edge function call. `checkoutSchema` não valida `name` com max length |
| **Checkout (funnel)** | 149 linhas — `CheckoutPage.tsx` | Usa `const sb = supabase as any` — type safety fraca. Sem tratamento de edge cases (funnel expirado, preço zero) |
| **SEO** | StoreSeoHead OK para loja. Product page tem OG+JSON-LD. | Falta `BreadcrumbList` JSON-LD na product page. Falta meta robots canonical consistency |

---

### Plano B5 — Separar Catálogo vs Pricing Intelligence

**Objectivo:** Isolar a gestão de catálogo (publicação, destaque, ordenação) da inteligência de preços (comparação concorrência, sugestões IA, bulk update).

**Criar `src/components/store/admin/`:**

| Ficheiro | Conteúdo |
|----------|----------|
| `CatalogProductsTable.tsx` | Tabela de produtos com colunas: imagem, nome, categoria, preço, publicado (switch), destaque (star), ordem (up/down), editar. Recebe `products`, `onTogglePublish`, `onToggleFeatured`, `onMoveOrder`, `onEdit`, `isLoading` como props |
| `PricingSuggestionsPanel.tsx` | Painel de sugestões de preço IA (linhas 317-378 do admin page). Recebe `suggestions`, `products`, `onApply`, `onDismiss` como props |
| `PricingIntelligenceSection.tsx` | Secção com: botão "Atualizar Preços", progress bar bulk, colunas de custo/margem/concorrência/Δ%. Compõe a área de pricing do admin. Recebe `products`, `onUpdateSinglePrice`, `onUpdateAllPrices`, `bulkProgress`, `loadingPrices` |
| `useStoreAdminProducts.ts` | Hook que extrai queries e mutations do admin page: `products` query, `updateProduct`, `applySuggestion`, `dismissSuggestion`, `updateSinglePrice`, `updateAllPrices`, `suggestions` query |

**Refatorar `StoreProductsAdminPage.tsx`:**
- Reduzir de 574 para ~80 linhas
- Page compõe: Header + `PricingSuggestionsPanel` + Tabs (Catálogo | Pricing Intelligence)
- Tab "Catálogo" → `CatalogProductsTable` (publicação, destaque, ordenação, edit)
- Tab "Preços & Concorrência" → `PricingIntelligenceSection` (custo, margem, concorrência, Δ%, sugestões, bulk update)
- Ambas as tabs partilham o mesmo dataset via `useStoreAdminProducts`

---

### Plano B6 — Hardening Checkout + SEO

**6.1 — Checkout hardening**

**`checkoutSchema.ts`:**
- Adicionar `max(100)` ao name
- Adicionar `max(255)` ao email
- Exportar schema unificado para validação completa

**`StoreCheckoutPage.tsx`:**
- Adicionar `TrustBadges` component (já existe em `src/components/checkout/TrustBadges.tsx`) abaixo do botão de pagamento
- Adicionar tratamento de erro mais específico: network errors vs server errors vs validation errors

**`CheckoutPage.tsx` (funnel checkout):**
- Remover `const sb = supabase as any` — usar supabase diretamente com proper typing
- Adicionar validação de preço zero (não permitir submit se total === 0 sem gift card)
- Adicionar `TrustBadges` após o form

**6.2 — SEO hardening**

**Criar `src/components/store/storefront/ProductSeoHead.tsx`:**
- Extrair o bloco Helmet+JSON-LD da `StoreProductPage.tsx` (linhas 202-238) para componente reutilizável
- Adicionar `BreadcrumbList` JSON-LD structured data (Loja > Categoria > Produto)
- Adicionar `product:price:amount` e `product:price:currency` Open Graph tags
- Recebe props: `product`, `storeName`, `wsSlug`, `pricing`, `reviewAvg`, `reviewCount`, `images`, `primaryIndex`

**Refatorar `StoreProductPage.tsx`:**
- Substituir inline Helmet por `<ProductSeoHead />`
- Reduz ~40 linhas no ficheiro principal

---

### Ficheiros a Criar

| Ficheiro | Batch |
|----------|-------|
| `src/components/store/admin/CatalogProductsTable.tsx` | B5 |
| `src/components/store/admin/PricingSuggestionsPanel.tsx` | B5 |
| `src/components/store/admin/PricingIntelligenceSection.tsx` | B5 |
| `src/components/store/admin/useStoreAdminProducts.ts` | B5 |
| `src/components/store/storefront/ProductSeoHead.tsx` | B6 |

### Ficheiros a Refatorar

| Ficheiro | De | Para | Batch |
|----------|----|------|-------|
| `StoreProductsAdminPage.tsx` | 574 | ~80 | B5 |
| `StoreProductPage.tsx` | 734 | ~695 | B6 |
| `checkoutSchema.ts` | 18 | ~22 | B6 |
| `CheckoutPage.tsx` (funnel) | 149 | ~155 | B6 |
| `StoreCheckoutPage.tsx` | 181 | ~190 | B6 |

### Sem alterações a
- Rotas
- Edge functions
- Database schema
- Hooks existentes (useStoreProducts, usePriceComparison, etc.)
- Store frontend (StorePage, StoreHeader, StoreFooter)

### Riscos
- B5 tab separation: garantir que ambas as tabs partilham o dataset — mitigado via hook centralizado
- B6 SEO: Helmet re-render — mitigado extraindo para componente puro com props

### Critérios de Aceitação
- Admin page tem 2 tabs claras: Catálogo e Preços
- Sugestões de preço IA aparecem apenas na tab de preços
- Checkout store tem trust badges visíveis
- Checkout funnel sem `as any` no supabase
- Product page tem BreadcrumbList JSON-LD
- Schemas de checkout validam comprimento máximo
- Nenhuma funcionalidade removida

