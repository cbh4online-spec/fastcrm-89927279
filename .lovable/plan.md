## Fase 3 — Performance, Bulk Actions, Dashboard & UX

### 1. Virtualização da tabela com @tanstack/react-virtual
**Ficheiro:** `src/components/products/table/ProductsDataTable.tsx`

- Substituir `<TableBody>` por container virtualizado com `useVirtualizer`
- Scroll contínuo (remover paginação client-side) — manter `ProductsPagination` apenas como controlo de page size
- Overscan de 5 linhas para smooth scrolling
- Container com altura fixa (`calc(100vh - 320px)`) para scroll interno
- Manter checkbox, resize de colunas e inline editing

### 2. Bulk Actions Avançadas
**Ficheiro:** `src/components/products/table/ProductBulkActions.tsx` + hook

- **Publicar/Despublicar em massa**: Toggle `store_published` para todos os selecionados
- **Alterar billing_type em massa**: Dropdown para selecionar novo tipo de cobrança
- **Duplicar produtos**: Criar cópias com nome `"{nome} (cópia)"` e SKU limpo
- Feedback via toast com contagem de sucesso/erro

### 3. Dashboard de Produtos (KPIs)
**Ficheiro novo:** `src/components/products/ProductsDashboard.tsx`

- Grid de cards com KPIs acionáveis:
  - Valor total do catálogo (soma base_price)
  - Margem média ponderada
  - Distribuição por billing_type (mini bar chart)
  - Distribuição por product_type
  - Produtos criados últimos 30 dias
  - Completude do catálogo (% com imagem, custo, categoria, descrição)
- Renderizado acima da tabela quando tab "produtos" está ativa
- Toggle para mostrar/esconder dashboard (persistido em localStorage)

### 4. Melhorias UX Gerais
**Ficheiros:** Vários

- **Estados vazios melhorados**: Ilustração + CTA contextual quando filtros não retornam resultados
- **Tooltips informativos**: Em colunas (margem, loja online) e nos health indicators
- **Contagem de filtros activos**: Badge no botão de filtros com nº de filtros activos
- **Empty search state**: Mensagem distinta quando pesquisa não encontra resultados vs. catálogo vazio
- **Scroll-to-top**: Quando muda de página ou aplica filtro

### Ficheiros a alterar/criar
- `src/components/products/table/ProductsDataTable.tsx` — virtualização
- `src/components/products/table/ProductBulkActions.tsx` — novas ações em massa
- `src/components/products/ProductsDashboard.tsx` — novo componente dashboard
- `src/components/products/ProductsList.tsx` — integrar dashboard + UX
- `src/components/products/hooks/useProductsListState.ts` — novas mutations bulk
- `src/components/products/table/ProductsPagination.tsx` — simplificar para page size only

### Ordem de execução
1. Virtualização da tabela (fundação performance)
2. Bulk actions avançadas (rápido, independente)
3. Dashboard de KPIs (novo componente)
4. Melhorias UX (polishing final)
