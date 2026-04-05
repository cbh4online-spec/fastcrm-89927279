

# Funcionalidades Complementares ao Motor de Inteligência de Preços

## Estado Atual

Já implementado:
- Tabelas `product_pricing_rules` e `product_market_research` com RLS
- Edge function `ai-market-price-research` (Firecrawl + Gemini)
- `MarginProtectionCard` e `MarketResearchPanel` no detalhe do produto
- `MarginStatusBadge` para a listagem
- Hook `useProductPricingIntelligence` com regras e pesquisa

**Ainda não implementado** (previsto no plano original):
- Página de gestão de regras de margem por categoria (PricingRulesSettings)
- Coluna "vs Mercado" na listagem de produtos
- Badges de alerta de margem na `ProductsDataTable`

## Funcionalidades Recomendadas (por ordem de impacto)

### 1. Gestão de Regras de Margem (Configurações)
**Prioridade: Alta — sem isto, as regras ficam apenas com o fallback de 10%**

- Nova secção em Configurações > Produtos: `PricingRulesSettings.tsx`
- CRUD de regras por categoria com presets (Electrónica 15%, Acessórios 30%, Alimentar 25%)
- Formulário: categoria (dropdown das existentes), margem mínima %, target %, máxima %
- Tabela de regras ativas com toggle on/off

### 2. Alertas de Margem na Listagem de Produtos
**Prioridade: Alta — visibilidade imediata de problemas**

- Integrar `MarginStatusBadge` como coluna "Status" na `ProductsDataTable`
- Ordenação por status (danger primeiro)
- Filtro rápido: "Mostrar apenas produtos com margem em risco"
- Counter no header: "12 produtos abaixo da margem mínima"

### 3. Bloqueio Hard ao Guardar Produto
**Prioridade: Alta — critério de aceitação do plano original**

- Validação no formulário de edição: impedir guardar se preço < custo (toast + disable botão)
- Warning modal se preço < custo × (1 + min_margin): "Tem a certeza? Margem abaixo do recomendado"
- Override apenas para admin (com registo em audit log)

### 4. Dashboard de Saúde de Preços
**Prioridade: Média — visão executiva**

- Widget no dashboard principal ou na tab Relatórios de Produtos
- KPIs: % produtos saudáveis vs warning vs danger, margem média do catálogo, valor em risco (receita de produtos com margem negativa)
- Gráfico de distribuição de margens por categoria (Recharts)
- Top 10 produtos com pior margem

### 5. Repricing Automático Sugerido
**Prioridade: Média — automação inteligente**

- Batch action: "Sugerir preços para X produtos com margem baixa"
- Usa regra da categoria + dados de mercado (se existirem) para calcular preço sugerido
- Preview em tabela antes de aplicar: preço atual → preço sugerido → nova margem
- Aplicação em massa com confirmação

### 6. Monitorização Periódica de Mercado
**Prioridade: Média — manter dados frescos**

- Trigger.dev job semanal para re-pesquisar preços dos top N produtos
- Notificação quando preço de mercado muda >10%
- Histórico de evolução de preço de mercado (sparkline no detalhe)

### 7. Alertas por Email/Notificação
**Prioridade: Baixa — complementar**

- Notificação quando um produto é editado para margem abaixo do mínimo
- Resumo semanal: "5 produtos precisam de revisão de preço"
- Integração com o sistema de notificações existente

## Ficheiros a Criar/Alterar

| # | Ficheiro | Ação |
|---|---------|------|
| 1 | `src/components/products/pricing/PricingRulesSettings.tsx` | Criar |
| 2 | `src/components/products/table/ProductsDataTable.tsx` | Alterar (coluna status + filtro) |
| 3 | `src/components/products/ProductDetailDialog.tsx` | Alterar (validação save) |
| 4 | `src/components/products/pricing/PricingHealthDashboard.tsx` | Criar |
| 5 | `src/components/products/pricing/BatchRepricingPanel.tsx` | Criar |
| 6 | `trigger/jobs/market-price-monitor.ts` | Criar |
| 7 | Rota de Settings | Alterar (adicionar tab Regras de Margem) |

## Recomendação

Sugiro implementar pela ordem **1 → 2 → 3 → 4**, que cobre a base funcional completa: definir regras, visualizar problemas, bloquear erros, e ter visão executiva. Os itens 5-7 são extensões de automação para uma segunda fase.

