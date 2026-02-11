

# Sugestoes de Preco Desaparecem Apos Aplicar

## Problema

Quando o utilizador clica no botao verde (check) para aplicar uma sugestao de preco, a sugestao permanece visivel na lista ate que a query seja re-executada pelo servidor. Isto cria uma sensacao de que nada aconteceu, especialmente se a rede for lenta.

## Solucao

Adicionar **optimistic update** para remover imediatamente a sugestao da lista quando o utilizador clica em "Aplicar" ou "Descartar", sem esperar pela resposta do servidor. Se o servidor falhar, a sugestao volta a aparecer.

## Seccao Tecnica

### Ficheiro: `src/pages/StoreProductsAdminPage.tsx`

**applySuggestion (linhas 90-112):**
- Adicionar `onMutate` para remover optimisticamente a sugestao da cache do React Query antes da chamada ao servidor
- Guardar o estado anterior para rollback em caso de erro
- Adicionar `onSettled` para garantir refetch final

**dismissSuggestion (linhas 114-126):**
- Mesmo tratamento optimistico

Logica do optimistic update:

```text
onMutate: async (suggestion) => {
  await queryClient.cancelQueries({ queryKey: ["price-suggestions"] });
  const previous = queryClient.getQueryData(["price-suggestions", workspaceId]);
  queryClient.setQueryData(["price-suggestions", workspaceId], (old) =>
    old.filter(s => s.id !== suggestion.id)
  );
  return { previous };
},
onError: (err, vars, context) => {
  queryClient.setQueryData(["price-suggestions", workspaceId], context.previous);
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ["price-suggestions"] });
}
```

Isto garante que a sugestao desaparece instantaneamente ao clicar, independentemente da velocidade da rede.

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `src/pages/StoreProductsAdminPage.tsx` | Adicionar optimistic updates nas mutations `applySuggestion` e `dismissSuggestion` para remover sugestoes da lista imediatamente ao clicar |
