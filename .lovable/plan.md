

# Adicionar Filtro Rápido "Sem Custo" na Toolbar

## Contexto

Os KPI cards (linha 924) já permitem clicar para filtrar por "Sem custo", mas ficam abaixo da toolbar e não são muito evidentes. O pedido é adicionar um botão de filtro rápido mais visível e acessível directamente na toolbar.

## Alteração

| Ficheiro | Acção |
|---|---|
| `src/components/products/ProductsList.tsx` | Adicionar botão "Sem custo" como `leftActions` na Toolbar, ao lado do botão de sidebar |

### Detalhe

Na prop `leftActions` da `Toolbar` (linhas 868-881), adicionar um botão toggle ao lado do botão de painel lateral:

- Ícone `AlertTriangle` + label "Sem custo" + badge com contagem (`productIndicators.noCost`)
- Ao clicar, chama `handleFilterSelect("smart_no_cost")` (toggle on/off)
- Estilo activo: `bg-warning/10 text-warning border-warning/30` quando `activeFilterId === "smart_no_cost"`
- Estilo inactivo: `variant="ghost"` normal
- Só aparece se `productIndicators.noCost > 0` para não ocupar espaço quando não há produtos sem custo

