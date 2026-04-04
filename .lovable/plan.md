## Fase 8 — Storefront, Fornecedores & Compras, Analytics e Faturação

### 1. Catálogo Público / Storefront (melhorias)
**Componente:** `src/components/products/PublicCatalogEnhancements.tsx`
- Integrar bundles no storefront com badge "Kit"
- Mostrar preço original riscado + preço com regras aplicadas
- Filtro por bundle/kit na listagem pública

### 2. Gestão de Fornecedores & Compras
**Tabelas:** `purchase_orders`, `purchase_order_items`, `goods_receipts`
- Criar encomendas de compra a fornecedores existentes (tabela suppliers já existe)
- Itens da encomenda ligados a produtos com qty e preço unitário
- Receção de stock: confirmar entregas parciais/totais com atualização automática de stock
- Histórico de custos por produto/fornecedor

### 3. Relatórios & Analytics de Produto
**Componente:** `src/components/products/ProductReportsTab.tsx`
- Top sellers por receita e quantidade
- Margem média por categoria (gráfico)
- Tendências de preço (linha temporal)
- Previsão de stock baseada em velocidade de venda
- Utiliza dados existentes da edge function `compute-product-analytics`

### 4. Integração com Faturação
**Componente:** melhorias em hooks existentes
- Sync de preços produto → linhas de fatura
- Campo de taxa de imposto por produto (IVA)
- Auto-completar produto ao criar linha de fatura

### Ordem de implementação
1. Migration DB (purchase_orders, purchase_order_items, goods_receipts + campo tax_rate em products)
2. Hooks para compras e receções
3. UI de gestão de compras
4. Tab de relatórios/analytics
5. Melhorias storefront (bundles + pricing rules)
6. Integração faturação
