

# Corrigir Larguras Iniciais das Colunas

## Problema

Todas as colunas usam `DEFAULT_WIDTH = 150px` como fallback quando não há largura guardada. Com 7-8 colunas visíveis por defeito, isso resulta em colunas demasiado largas que excedem o ecrã.

## Solução

### 1. Definir larguras iniciais por coluna

**Ficheiro**: `src/components/products/ProductsList.tsx`

Criar mapa de larguras iniciais adequadas ao conteúdo de cada coluna:

| Coluna | Largura |
|--------|---------|
| name | 220px |
| sku | 120px |
| product_type | 100px |
| category | 130px |
| base_price | 90px |
| direct_cost | 100px |
| margin | 80px |
| billing_type | 100px |
| status | 90px |
| b2b_published | 80px |
| updated_at | 110px |
| (restantes) | 100px |

Usar este mapa no fallback: `colWidths.widths[col.id] || INITIAL_COL_WIDTHS[col.id] || 100`

### 2. Reduzir DEFAULT_WIDTH no hook

**Ficheiro**: `src/hooks/useColumnWidths.ts`

Alterar `DEFAULT_WIDTH` de `150` para `100` como fallback global mais compacto.

### 3. Coluna "name" mais larga, restantes compactas

A coluna Nome fica com 220px para acomodar os indicadores inline. As restantes ficam entre 80-130px para caber todas no ecrã sem scroll horizontal desnecessário.

## Ficheiros
- `src/hooks/useColumnWidths.ts` — DEFAULT_WIDTH → 100
- `src/components/products/ProductsList.tsx` — mapa INITIAL_COL_WIDTHS + usar como fallback

