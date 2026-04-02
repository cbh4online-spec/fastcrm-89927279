

# Unificar Produtos da Loja com Catálogo de Vendas

## Diagnóstico

A arquitectura de dados já está correcta — a loja online e o módulo de vendas usam **a mesma tabela `products`**. O campo `store_published` controla a visibilidade na loja. Não existe tabela `store_products` separada.

O problema é na **experiência de gestão**:

1. **Duas páginas admin paralelas**: `/dashboard/products` (1225 linhas, completo) e `/dashboard/store-products` (simplificado, apenas store)
2. **Dialog de edição duplicado**: `StoreProductEditDialog` é uma versão reduzida do `ProductDetailDialog`
3. **Sem ligação cruzada**: a página de produtos principal não tem coluna/filtro `store_published`, e a página da loja não liga ao produto completo
4. **Funcionalidades ausentes na loja admin**: variantes, tabelas de preço, imagens avançadas, especificações, tags, documentos, barcode — tudo só existe em `/dashboard/products`

## Solução

Eliminar a duplicação mantendo a página da loja como **vista filtrada** com funcionalidades store-específicas, e adicionando integração bidirecional.

### Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/products/ProductsList.tsx` | Adicionar coluna `store_published` (switch inline) + filtro no sidebar. Adicionar badge "Na Loja" visível na lista |
| `src/components/store/admin/CatalogProductsTable.tsx` | Adicionar botão "Ver ficha completa" que navega para `/dashboard/products` com o produto selecionado (via query param ou dialog) |
| `src/components/store/StoreProductEditDialog.tsx` | Adicionar link "Editar ficha completa →" que abre o `ProductDetailDialog` ou navega para a página de produtos |
| `src/pages/StoreProductsAdminPage.tsx` | Adicionar nota informativa: "Os produtos da loja são os mesmos do catálogo de vendas. Para edição completa, use Produtos." com link directo |

### Detalhe por alteração

**1. ProductsList — coluna + filtro `store_published`**
- Adicionar entrada no array `PRODUCT_COLUMNS`: `{ id: "store_published", label: "Loja Online", category: "basic", defaultVisible: true }`
- Renderizar como Switch inline (igual ao da `CatalogProductsTable`)
- Adicionar filtro "Publicado na Loja" no `FilterSidebar` (sim/não/todos)

**2. CatalogProductsTable — link para ficha completa**
- Na coluna de acções (onde está o Pencil), adicionar botão `Eye` que navega para `/dashboard/products?highlight={productId}`
- Alternativa mais simples: o botão Pencil existente abre o `ProductDetailDialog` em vez do `StoreProductEditDialog` simplificado

**3. StoreProductEditDialog — link cruzado**
- Adicionar no topo do dialog: `<Button variant="link" onClick={() => navigate('/dashboard/products')}>Editar ficha completa →</Button>`

**4. StoreProductsAdminPage — banner informativo**
- Adicionar `<Alert>` discreto no topo: "Estes são os mesmos produtos do catálogo comercial. Publicar/despublicar controla a visibilidade na loja."
- Botão "Ir para Catálogo Completo" que navega para `/dashboard/products`

## Critérios de aceitação
- Na página de Produtos (`/dashboard/products`), consigo ver e alterar `store_published` directamente
- Na página da Loja (`/dashboard/store-products`), consigo navegar para a ficha completa do produto
- Não há dados duplicados — tudo referencia a mesma tabela `products`
- Zero regressões no storefront público

