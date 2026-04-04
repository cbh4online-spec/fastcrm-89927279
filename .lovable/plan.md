## Fase 7 — Bundles, Pricing Rules, Storefront & Alertas de Stock

### 1. Bundles & Kits de Produtos
**Tabelas:** `product_bundles`, `product_bundle_items`
- Criar bundle com nome, descrição, desconto (% ou valor fixo)
- Associar N produtos com quantidade por item
- Preço calculado = soma dos itens - desconto
- Stock do bundle = mínimo do stock dos componentes
- UI: tab "Bundles" no detalhe do produto + gestão dedicada

### 2. Pricing Rules & Descontos Automáticos
**Tabela:** `pricing_rules`
- Tipos de regra: volume (qty >= X), cliente/segmento, período (data início/fim), categoria
- Campos: rule_type, condition_json, discount_type (percentage/fixed), discount_value, priority, is_active
- Motor de cálculo: função que aplica regras por prioridade ao preço base
- UI: página de gestão de regras com preview de impacto

### 3. Catálogo Público / Storefront (melhorias)
- Integrar bundles no storefront existente
- Mostrar preços com regras aplicadas (preço original riscado + preço final)
- Filtro por bundle/kit na listagem
- Badge "Kit" nos cards de produto

### 4. Alertas de Stock & Reposição
**Tabela:** `stock_alerts`
- Configurar threshold mínimo por produto
- Notificação automática quando stock <= threshold (via trigger DB)
- Dashboard de alertas ativos com ação rápida de reposição
- Sugestão de quantidade baseada em histórico de vendas (média últimos 3 meses)

### Ordem de implementação
1. Migration DB (bundles + pricing_rules + stock_alerts)
2. Hooks e componentes de Bundles
3. Motor de Pricing Rules
4. Alertas de Stock
5. Integração no Storefront
