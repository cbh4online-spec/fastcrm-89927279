

# Corrigir Imagens na Lista de Produtos

## Diagnóstico

A lista de produtos usa `product.images` (coluna `images` da tabela `products`, tipo array de URLs) para mostrar thumbnails. No entanto, as imagens são geridas na tabela separada `product_images` — que é a fonte correcta usada pelo `ProductDetailDialog` via `useProductImages()`.

Resultado: a coluna `images` na tabela `products` está vazia/null para a maioria dos produtos, mas as imagens existem na tabela `product_images`. Por isso aparecem ao editar mas não na lista.

## Solução

Modificar o hook `useProducts` para incluir um join com `product_images` (apenas a primeira imagem por produto, ordenada por `position`) e alimentar a thumbnail na lista a partir daí.

**Abordagem**: Em vez de fazer N+1 queries, usar um subquery ou fazer um batch fetch das primeiras imagens de todos os produtos carregados, e injectar no resultado.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/hooks/useProducts.ts` | Após carregar produtos, buscar primeiras imagens da tabela `product_images` em batch e injectar no campo `images` de cada produto |
| `src/components/products/ProductsList.tsx` | Nenhuma alteração necessária — já usa `product.images?.[0]` que passará a ter dados |

### Detalhe técnico

No `useProducts`, após o fetch principal:

1. Extrair todos os `product.id` do resultado
2. Query `product_images` com `in("product_id", ids)`, `order("position")`, seleccionar `product_id, url`
3. Agrupar por `product_id`, pegar a primeira URL de cada
4. Popular `product.images = [firstUrl]` para cada produto

Isto mantém a interface existente (`product.images?.[0]`) sem alterar nenhum componente de UI.

