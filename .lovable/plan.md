## Fase 4 — Personalização, Exportação Avançada, Auditoria & Inteligência

### 1. Personalização avançada de colunas
**Ficheiro:** `src/components/common/ColumnSelector.tsx` + `ProductsDataTable.tsx`

- Drag-to-reorder colunas no seletor (já usa `@dnd-kit`)
- Persistir larguras de colunas em localStorage (já implementado via `useColumnWidths`)
- Botão "Repor predefinições" para reset completo de ordem + visibilidade + larguras
- Preset de layouts guardados pelo utilizador (ex: "Vista Financeira", "Vista Catálogo")

### 2. Exportação/Importação avançada
**Ficheiro novo:** `src/components/products/ProductsExportDialog.tsx`

- Exportar com filtros activos (apenas produtos visíveis)
- Exportar para Excel (.xlsx) com `exceljs` (já instalado) + CSV
- Selecção de colunas a exportar
- Formatação profissional no Excel (headers, cores, auto-width)

### 3. Auditoria e histórico de produto
**Ficheiros:** `src/components/products/ProductActivityLog.tsx`

- Consultar `activity_logs` para mostrar histórico de alterações
- Timeline visual com diff de campos (preço anterior → novo preço)
- Mostrar quem alterou e quando
- Integrar na tab de detalhes do produto (ProductDetailDialog)

### 4. Inteligência de catálogo
**Ficheiro novo:** `src/components/products/CatalogInsights.tsx`

- Alertas automáticos no dashboard:
  - Produtos com preço desactualizado (>90 dias sem alteração de preço)
  - Produtos sem venda associada (cruzar com deals se disponível)
  - Sugestão de preço baseada em margem-alvo do workspace
- Comparação lado-a-lado de 2-3 produtos selecionados
- Mini-card com "saúde" do catálogo (score 0-100)

### Ordem de execução
1. Exportação avançada (valor imediato, independente)
2. Personalização de colunas (UX refinement)
3. Auditoria/histórico (depende de activity_logs existente)
4. Inteligência de catálogo (feature final)

### Ficheiros a alterar/criar
- `src/components/products/ProductsExportDialog.tsx` (novo)
- `src/components/products/ProductActivityLog.tsx` (novo)
- `src/components/products/CatalogInsights.tsx` (novo)
- `src/components/products/ProductComparisonSheet.tsx` (novo)
- `src/components/products/ProductsList.tsx` — integrar export + insights
- `src/components/products/ProductDetailDialog.tsx` — integrar activity log
- `src/components/products/hooks/useProductsListState.ts` — export avançado
- `src/components/products/table/ProductBulkActions.tsx` — botão comparar
