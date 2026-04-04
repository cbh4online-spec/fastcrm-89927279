## Fase 5 — Comparação, Presets, Analytics Avançado & Automações de Catálogo ✅

### 1. Comparação de produtos (side-by-side) ✅
**Ficheiro:** `src/components/products/ProductComparisonSheet.tsx`
- Sheet com comparação lado-a-lado de 2-3 produtos selecionados
- Diff visual: preço, custo, margem, categoria, status, specs, imagens
- Highlight automático de diferenças entre produtos
- Botão "Comparar" nas bulk actions (min 2, max 3 selecionados)

### 2. Presets de layout salvos ✅
**Ficheiro:** `src/components/products/table/LayoutPresetsManager.tsx`
- Presets built-in: "Vista Completa", "Vista Financeira", "Vista Catálogo"
- Presets custom persistidos em localStorage
- Dropdown no toolbar para trocar rapidamente
- Guardar/eliminar presets custom

### 3. Dashboard analítico avançado ✅
**Ficheiro:** `src/components/products/ProductsAnalyticsDashboard.tsx`
- Gráfico de distribuição por categoria (donut via recharts)
- Gráfico de distribuição por status (bar chart)
- Top 10 produtos por margem (horizontal bar)
- KPIs: total, preço médio, margem média, % com imagem, % com custo
- Collapsible toggle

### 4. Automações de catálogo ✅
**Ficheiro:** `src/components/products/CatalogAutomations.tsx`
- Alertas automáticos: preço desatualizado, sem imagem, margem negativa, margem baixa, sugestão de preço
- Cards clicáveis que ativam filtros correspondentes
- Dismiss/snooze persistido em localStorage
- Badges de severidade (critical/warning/info)
