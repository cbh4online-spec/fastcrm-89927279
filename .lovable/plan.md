
# Plano: Motor de Inteligência de Preços & Proteção de Margem

## Visão Geral
Sistema dual: (1) Pesquisa de mercado via IA para análise competitiva de preços, (2) Regras automáticas de margem mínima por categoria que impedem venda abaixo do custo.

## Componente 1: Regras de Margem Mínima (Proteção)

### Base de Dados
- Tabela `product_pricing_rules`: `workspace_id`, `category`, `min_margin_pct` (margem mínima %), `max_margin_pct`, `target_margin_pct`, `applies_to` (all/category/product), `product_id?`, `is_active`
- RLS escopado por workspace

### Frontend — Listagem de Produtos
- Alerta visual (badge vermelho) em produtos com margem negativa ou abaixo da margem mínima da categoria
- Coluna "Status Preço" com ícones: ✅ saudável, ⚠️ abaixo do target, 🔴 abaixo do custo

### Frontend — Detalhe do Produto
- Card "Proteção de Margem" mostrando: margem atual, margem mínima da categoria, preço mínimo sugerido (custo × (1 + min_margin))
- Validação ao guardar: toast de aviso se preço < custo × (1 + min_margin), bloqueio se preço < custo

### Gestão de Regras
- Secção em Configurações > Produtos para definir margens mínimas por categoria
- Presets por tipo de produto (ex: Electrónica 15-25%, Acessórios 30-50%)

## Componente 2: Pesquisa de Mercado com IA

### Edge Function `ai-market-price-research`
- Recebe: nome do produto, SKU, categoria, EAN/barcode
- Usa Lovable AI (gemini-3-flash-preview) com tool calling para extrair dados estruturados
- Pesquisa via Firecrawl (já configurado) por preços de concorrentes em PT
- Retorna: preço médio mercado, range min-max, concorrentes encontrados, margem sugerida

### Base de Dados
- Tabela `product_market_research`: `product_id`, `workspace_id`, `market_avg_price`, `market_min_price`, `market_max_price`, `competitors_json` (nome, preço, url), `suggested_price`, `suggested_margin_pct`, `research_date`, `model_used`

### Frontend — Detalhe do Produto
- Botão "🔍 Analisar Mercado" no card de preço
- Painel de resultados: preço médio, range, lista de concorrentes, sugestão de preço com margem segura
- Histórico de pesquisas anteriores

### Frontend — Listagem
- Coluna opcional "vs Mercado" mostrando posição relativa (acima/abaixo/inline)

## Ficheiros a Criar/Alterar

### Novos
1. `supabase/functions/ai-market-price-research/index.ts` — Edge function de pesquisa
2. `src/hooks/useProductPricingIntelligence.ts` — Hook para pesquisa e regras
3. `src/components/products/pricing/MarketResearchPanel.tsx` — Painel de resultados
4. `src/components/products/pricing/MarginProtectionCard.tsx` — Card de proteção
5. `src/components/products/pricing/PricingRulesSettings.tsx` — Gestão de regras

### Alterados
6. `src/components/products/table/ProductsDataTable.tsx` — Badges de alerta de margem
7. Detalhe do produto — Adicionar tab/secção de inteligência de preços

## Critérios de Aceitação
- Nunca permitir guardar produto com preço < custo (bloqueio hard)
- Aviso visual quando margem < margem mínima da categoria
- Pesquisa de mercado retorna resultados em < 15s
- Resultados persistidos para consulta futura
- Desktop e mobile funcional
