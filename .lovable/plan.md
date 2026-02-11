

# Corrigir Sugestoes que Reaparecem Apos Aplicar

## Problema

O `onSettled` dispara `invalidateQueries` imediatamente apos cada mutation, o que causa um refetch da base de dados. Se houver varias mutations em paralelo (o utilizador clica rapidamente em varias sugestoes), cada `onSettled` faz um refetch que traz de volta as sugestoes que foram removidas optimisticamente por outras mutations ainda em curso. Alem disso, o refetch pode chegar antes da transacao estar totalmente committed.

## Solucao

1. **Remover `onSettled`** de ambas as mutations -- o refetch automatico apos cada mutation e a causa do problema
2. **Mover a invalidacao para `onSuccess`** com a query key exacta (incluindo workspaceId), garantindo que so refetch depois de confirmacao do servidor
3. **Nao invalidar `["price-suggestions"]`** no `onSuccess` -- a remocao optimistica ja e suficiente; o refetch so e necessario se houver erro (e o rollback ja trata disso)
4. Invalidar apenas `["store-admin-products"]` no `onSuccess` (para atualizar o preco na tabela de produtos)

## Seccao Tecnica

### Ficheiro: `src/pages/StoreProductsAdminPage.tsx`

**applySuggestion:**
- Remover bloco `onSettled` (linhas 122-124)
- No `onSuccess`, remover a invalidacao de `price-suggestions` -- manter apenas `store-admin-products`

**dismissSuggestion:**
- Remover bloco `onSettled` (linhas 151-153)
- Nao invalidar `price-suggestions` no `onSuccess`

A ideia: confiar nos optimistic updates para o estado visual. O rollback em `onError` ja garante consistencia se algo falhar. Nao e necessario re-buscar do servidor apos sucesso, pois o estado local ja esta correto.

| Ficheiro | Alteracao |
|---|---|
| `src/pages/StoreProductsAdminPage.tsx` | Remover `onSettled` de ambas mutations e remover invalidacao de `price-suggestions` do `onSuccess` |

