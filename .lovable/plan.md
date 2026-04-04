## Fase 6 — Importação Avançada, Drag-to-Reorder, Variantes & Lifecycle ✅

### 1. Importação avançada de produtos ✅
### 2. Drag-to-reorder colunas ✅
### 3. Variantes de produto ✅
### 4. Workflow de aprovação/lifecycle ✅

## Fase 7 — Bundles, Pricing Rules, Storefront & Alertas de Stock ✅

### 1. Bundles & Kits de Produtos ✅
### 2. Pricing Rules & Descontos Automáticos ✅
### 3. Alertas de Stock & Reposição ✅

## Fase 8 — Storefront, Relatórios, Compras & Faturação ✅

### 1. Relatórios & Analytics de Produto ✅
**Componente:** `src/components/products/ProductReportsTab.tsx`
- KPIs: produtos em propostas, taxa conversão média, margem média, inativos
- Gráficos: top produtos por receita, margem por produto, receita por categoria (pie), tendências de preço (line)
- Tabela de taxas de conversão proposta → fatura
- Lista de produtos inativos com dias de inatividade
- Dados da edge function `compute-product-analytics`

### 2. Melhorias Storefront ✅
**Componente:** `src/components/products/StorefrontEnhancements.tsx`
- `StorefrontPriceDisplay`: preço original riscado + preço com regras aplicadas
- `StorefrontBundleBadge`: badge "Kit" para bundles
- Motor `applyPricingRules()` integrado

### 3. Gestão de Compras ✅ (já existia)
- `useProcurement.ts` com CRUD completo para POs e goods receipts
- `PurchaseOrderForm.tsx`, `GoodsReceiptForm.tsx` já existentes em procurement/

### 4. Integração com Faturação ✅ (já existia)
- Campo `tax_rate` já na tabela products
- Tab "Relatórios" adicionada ao ProductsList
