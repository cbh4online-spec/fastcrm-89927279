

# Plano: Corrigir Visualização de Produtos em Mobile

## Diagnóstico

A partir do screenshot, os produtos **existem** (footer mostra "1000 produtos") mas o corpo da tabela virtualizada é invisível. A causa raiz:

1. **Altura insuficiente para o scroll virtualizado**: `ProductsDataTable` usa `maxHeight: "calc(100vh - 380px)"` — os 380px assumem header desktop. Em mobile, com PageHeader + Toolbar (2 linhas de botões) + CatalogSummary (métricas + chips a ocupar 3+ linhas de wrap) + tabs, o conteúdo acima ultrapassa 500px, deixando a tabela com **altura negativa ou zero**.

2. **Toolbar e Summary não colapsam em mobile**: Todos os botões de ação (Scan, Exportar, Importar, SKUs, Criar), chips de filtro, métricas e selectores de layout ficam visíveis, cada um numa nova linha de wrap.

3. **Filter Sidebar abre por defeito** (`showFilterSidebar: true`), consumindo espaço lateral mesmo em mobile.

## Ficheiros a Alterar

### 1. `src/components/products/table/ProductsDataTable.tsx`
- Remover `maxHeight` fixo — substituir por `flex-1 min-h-0` que respeita o container flex
- Garantir que o container pai propaga a altura disponível corretamente

### 2. `src/components/products/ProductsList.tsx`
- Em mobile: esconder botões secundários do PageHeader (Scan, Exportar, Importar SKUs) — manter apenas "Criar Produto"
- Esconder Toolbar actions secundárias (Largura, Presets, ColumnSelector) em mobile
- Esconder `ProductsCatalogSummary` em mobile ou mostrar versão compacta (apenas health score + total)

### 3. `src/components/products/ProductsCatalogSummary.tsx`
- Em mobile: mostrar apenas 1 linha compacta (health score + valor total + contagem)
- Esconder chips de filtro e botão Analytics em mobile

### 4. `src/components/products/hooks/useProductsListState.ts`
- `showFilterSidebar` default `false` em mobile (detectar via `window.innerWidth`)

## Critérios de Aceitação

- Tabela de produtos visível e scrollável em ecrãs ≤ 414px
- Sem overflow horizontal
- Todas as funções críticas acessíveis (criar, pesquisar, ver detalhe)
- Desktop sem alterações visuais

