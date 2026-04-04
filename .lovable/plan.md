## Fase 6 — Importação Avançada, Drag-to-Reorder, Variantes & Lifecycle ✅

### 1. Importação avançada de produtos ✅
**Ficheiro:** `src/components/products/ProductImportWizard.tsx` (novo)
- Wizard multi-step: Upload → Mapeamento → Preview → Importação → Resultado
- Suporte CSV e Excel (.xlsx) via papaparse + exceljs
- Auto-detecção de colunas (nome, preço, sku, categoria, etc.)
- Validação com erros por linha e resumo pré-confirmação
- Inserção em batch de 100 com progress bar

### 2. Drag-to-reorder colunas ✅
**Ficheiro:** `src/components/common/ColumnSelector.tsx` (já existia)
- Drag-and-drop nativo já implementado com handles visuais
- Botão "Reset" agora reseta ordem + visibilidade + larguras
- Prop `onResetWidths` passada para resetar larguras via `useColumnWidths`

### 3. Variantes de produto ✅ (já existia)
- Tabela `product_variants` já existente no DB
- `ProductVariantsManager.tsx` já completo com CRUD inline

### 4. Workflow de aprovação/lifecycle ✅ (já existia)
- `ProductLifecycleTab.tsx` já completo com workflow visual
- Estados: Rascunho → Em Revisão → Ativo → Descontinuado → Arquivado
- Changelog e notificações automáticas integrados

## Fase 7 — Bundles, Pricing Rules, Storefront & Alertas de Stock ✅

### 1. Bundles & Kits de Produtos ✅
**Tabelas:** `product_bundles`, `product_bundle_items`
**Componente:** `src/components/products/BundlesManager.tsx`
**Hook:** `src/hooks/useBundles.ts`
- CRUD completo de bundles com desconto (% ou fixo)
- Gestão de itens do bundle com selecção de produtos
- Cálculo de preço total e toggle de estado

### 2. Pricing Rules & Descontos Automáticos ✅
**Tabela:** `pricing_rules`
**Componente:** `src/components/products/PricingRulesManager.tsx`
**Hook:** `src/hooks/usePricingRules.ts`
- 4 tipos de regra: volume, cliente, período, categoria
- Motor de cálculo `applyPricingRules()` por prioridade
- Toggle de activação e gestão de datas

### 3. Alertas de Stock & Reposição ✅
**Tabela:** `stock_alerts`
**Componente:** `src/components/products/StockAlertsManager.tsx`
**Hook:** `src/hooks/useStockAlerts.ts`
- Threshold por produto com 3 estados (active/acknowledged/resolved)
- Dashboard de produtos com stock baixo (auto-refresh 60s)
- Acções rápidas: confirmar, resolver, remover

### 4. Integração ✅
- 3 novos tabs no ProductsList: Bundles, Regras de Preço, Alertas Stock
- RLS em todas as tabelas por workspace_id
