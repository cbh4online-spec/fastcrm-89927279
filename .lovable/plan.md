## Fase 5 — Comparação, Presets, Analytics Avançado & Automações de Catálogo

### 1. Comparação de produtos (side-by-side)
**Ficheiro:** `src/components/products/ProductComparisonSheet.tsx` (novo)

- Sheet/Dialog com comparação lado-a-lado de 2-3 produtos selecionados
- Diff visual: preço, custo, margem, categoria, status, specs, imagens
- Highlight automático de diferenças entre produtos
- Botão "Comparar" nas bulk actions (ProductBulkActions.tsx)
- Mínimo 2, máximo 3 produtos selecionados para activar

### 2. Presets de layout salvos
**Ficheiro:** `src/components/products/table/LayoutPresetsManager.tsx` (novo)

- Guardar configurações de colunas (visibilidade + ordem + larguras) como presets nomeados
- Presets built-in: "Vista Completa", "Vista Financeira", "Vista Catálogo"
- Presets custom do utilizador persistidos em localStorage
- Dropdown no toolbar para trocar rapidamente entre layouts
- Botão "Guardar vista actual" + "Eliminar preset"

### 3. Dashboard analítico avançado
**Ficheiro:** `src/components/products/ProductsAnalyticsDashboard.tsx` (novo)

- Gráfico de distribuição por categoria (pie/donut via recharts)
- Gráfico de distribuição por status (bar chart)
- Top 10 produtos por margem (horizontal bar)
- Evolução de preços médios ao longo do tempo (line chart, se dados disponíveis)
- KPIs: total produtos, preço médio, margem média, % com imagem, % com custo
- Toggle para mostrar/esconder no topo da listagem

### 4. Automações de catálogo
**Ficheiro:** `src/components/products/CatalogAutomations.tsx` (novo)

- Regras automáticas configuráveis:
  - Alerta de preço desatualizado (>N dias sem alteração)
  - Alerta de produto sem imagem
  - Alerta de margem negativa ou abaixo do threshold
  - Sugestão de preço baseada em margem-alvo do workspace
- Painel de alertas activos com contagem e severidade
- Possibilidade de dispensar/snooze alertas individuais
- Integração com CatalogInsights existente

### Ordem de execução
1. Comparação de produtos (independente, valor imediato)
2. Presets de layout (UX, independente)
3. Dashboard analítico (visualização, depende de dados)
4. Automações de catálogo (lógica de negócio, integra com insights)

### Ficheiros a alterar/criar
- `src/components/products/ProductComparisonSheet.tsx` (novo)
- `src/components/products/table/LayoutPresetsManager.tsx` (novo)
- `src/components/products/ProductsAnalyticsDashboard.tsx` (novo)
- `src/components/products/CatalogAutomations.tsx` (novo)
- `src/components/products/table/ProductBulkActions.tsx` — botão comparar
- `src/components/products/ProductsList.tsx` — integrar presets + analytics + automações
- `src/components/products/hooks/useProductsListState.ts` — suporte a presets