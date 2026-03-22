

# Apagar Produtos em Massa + Deteção de SKUs Inválidos

## Problema

1. A barra de ações em massa (bulk actions) só tem "Exportar" e "Arquivar" — falta **"Apagar"**
2. SKUs com HTML como `<td >265 g</td>` ou `<td ><strong>Iluminação mínima</strong></td>` foram importados incorretamente e devem ser identificados/limpos

## Alterações

### 1. Botão "Apagar" nas ações em massa

**Ficheiro**: `src/components/products/ProductsList.tsx` (linhas 680-695)

- Adicionar botão **"Apagar"** (vermelho, com ícone Trash2) à barra de bulk actions
- Ao clicar: mostra `AlertDialog` de confirmação com contagem ("Apagar X produtos permanentemente?")
- Ao confirmar: chama `useDeleteProductsBatch` para apagar todos de uma vez

### 2. Hook `useDeleteProductsBatch`

**Ficheiro**: `src/hooks/useProducts.ts`

Nova mutation que recebe um array de IDs e faz:
```ts
await supabase.from("products").delete().in("id", ids)
```
- Um único toast com resumo
- Um único `invalidateQueries`

### 3. Deteção e limpeza de SKUs inválidos

**Ficheiro**: `src/components/products/ProductsList.tsx`

Adicionar filtro inteligente "SKUs inválidos" no sidebar de filtros que identifica produtos cujo SKU:
- Contém tags HTML (`<td>`, `<strong>`, `</td>`, etc.)
- Contém texto descritivo (mais de 3 espaços, ou contém palavras como "Impermeável", "Ethernet", etc.)
- Regex: `/<[^>]+>|^\d+\s*[a-zA-Z]{1,3}$/` para apanhar coisas como "265 g"

Ao selecionar este filtro, mostra os produtos com SKUs suspeitos para o utilizador poder apagar em massa ou corrigir.

### 4. Limpeza automática de SKUs na importação

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

No `confirmMapping`, ao mapear a coluna SKU:
- Passar o valor por `stripHtmlTags()` para remover `<td>`, `<strong>`, etc.
- Se o valor resultante parecer descritivo (contém espaços, palavras longas, unidades), não usar como SKU — deixar vazio

## Ficheiros Modificados
- `src/hooks/useProducts.ts` — adicionar `useDeleteProductsBatch`
- `src/components/products/ProductsList.tsx` — botão apagar em massa + filtro SKUs inválidos
- `src/components/products/BatchSKUImportDialog.tsx` — limpeza de SKUs na importação

