
## Fase 2 — Performance & UX Avançada na Tabela de Produtos

### 1. Virtualização da tabela com @tanstack/react-virtual
**Ficheiro:** `src/components/products/table/ProductsDataTable.tsx`

- Substituir o `<TableBody>` por um container virtualizado usando `useVirtualizer` (já instalado como dependência)
- Renderizar apenas as linhas visíveis no viewport + overscan de 5 linhas
- Manter o suporte a colunas resizáveis e checkbox de seleção
- Remover a paginação client-side (passa a scroll contínuo com virtualização)
- Manter a opção de pageSize como "batch size" para a query ao servidor

**Impacto:** Tabela com 5000+ produtos sem lag; DOM reduzido de ~5000 rows para ~30.

### 2. Optimistic Updates nos toggles (Store Published, Archive)
**Ficheiro:** `src/components/products/hooks/useProductsListState.ts`

- No `toggleStorePublished` mutation: adicionar `onMutate` para atualizar o cache local imediatamente
- Rollback automático via `onError` se o servidor falhar
- Aplicar o mesmo padrão ao toggle de `b2b_published`
- Feedback visual: o Switch muda instantaneamente, sem esperar pelo servidor

```typescript
// Padrão optimistic update:
onMutate: async ({ id, published }) => {
  await queryClient.cancelQueries({ queryKey: ["products"] });
  const previous = queryClient.getQueryData(["products", ...]);
  queryClient.setQueryData(["products", ...], (old) => 
    old?.map(p => p.id === id ? { ...p, store_published: published } : p)
  );
  return { previous };
},
onError: (err, vars, context) => {
  queryClient.setQueryData(["products", ...], context?.previous);
},
onSettled: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
```

### 3. Filtros e ordenação server-side
**Ficheiros:** `src/hooks/useProducts.ts` + `src/components/products/hooks/useProductsListState.ts`

- Adicionar parâmetros `sortBy` e `sortDirection` ao hook `useProducts`
- Mover filtros de billing_type e store_published para a query SQL (em vez de filtrar localmente)
- Manter filtros "smart" (margem negativa, sem imagem, etc.) como client-side pois dependem de lógica calculada
- Adicionar paginação server-side com `range()` do Supabase para cursor-based loading

**Alterações na query:**
```typescript
let query = supabase.from("products").select("*", { count: "exact" });
if (sortBy === "name") query = query.order("name", { ascending: sortDirection === "asc" });
if (billingType) query = query.eq("billing_type", billingType);
if (storePublished !== undefined) query = query.eq("store_published", storePublished);
query = query.range(offset, offset + pageSize - 1);
```

### 4. Atalhos de teclado + Inline editing
**Ficheiros novos:**
- `src/components/products/table/InlinePriceEditor.tsx`
- `src/components/products/hooks/useProductKeyboardShortcuts.ts`

**Atalhos:**
- `Ctrl+F` / `Cmd+F` → Focar na barra de pesquisa
- `Escape` → Limpar seleção / fechar filtros
- `Ctrl+A` → Selecionar todos na página
- `Delete` → Abrir diálogo de apagar (com seleção ativa)

**Inline editing:**
- Duplo-clique nas colunas `base_price` e `direct_cost` → Abre input inline
- Enter para confirmar, Escape para cancelar
- Mutation com optimistic update para feedback instantâneo
- Validação: preço >= 0, formato numérico

### Ficheiros a alterar/criar
- `src/components/products/table/ProductsDataTable.tsx` — virtualização + inline editing
- `src/components/products/hooks/useProductsListState.ts` — optimistic updates
- `src/hooks/useProducts.ts` — server-side filters/sort/pagination
- `src/components/products/table/InlinePriceEditor.tsx` — novo componente
- `src/components/products/hooks/useProductKeyboardShortcuts.ts` — novo hook
- `src/components/products/table/ProductsPagination.tsx` — adaptar para server-side
- `src/components/products/ProductsList.tsx` — wiring dos novos parâmetros

### Ordem de execução
1. Server-side filtering + sorting (fundação para virtualização)
2. Optimistic updates (independente, rápido)
3. Virtualização (depende de server-side pagination)
4. Inline editing + keyboard shortcuts (UX final)

### Critérios de aceitação
- [ ] 5000 produtos renderizam sem lag visível (<16ms por frame)
- [ ] Toggles de loja/B2B reflectem-se instantaneamente no UI
- [ ] Ordenação por nome/preço/data acontece no servidor
- [ ] Filtros billing_type e store_published são SQL-side
- [ ] Duplo-clique em preço/custo permite edição inline
- [ ] Ctrl+F foca pesquisa, Escape limpa seleção
- [ ] Rollback visual se o servidor rejeitar um toggle
