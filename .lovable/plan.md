

# Produtos da Loja com Edição Completa (ProductDetailDialog)

## Diagnóstico

Na `CatalogProductsTable`, o botão Pencil abre o `StoreProductEditDialog` — um formulário simplificado com campos limitados. O utilizador quer que a edição use exactamente o mesmo `ProductDetailDialog` completo (652 linhas, com tabs de variantes, imagens, stock, specs, analytics, etc.) usado na página `/dashboard/products`.

## Solução

Substituir o uso do `StoreProductEditDialog` pelo `ProductDetailDialog` na página da loja. Tornar o nome do produto clicável também.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/pages/StoreProductsAdminPage.tsx` | Substituir `StoreProductEditDialog` por `ProductDetailDialog`. Mudar state de `editProduct: ProductStoreData` para `editProductId: string \| null` |
| `src/components/store/admin/CatalogProductsTable.tsx` | 1. Tornar o nome do produto clicável (cursor pointer, hover underline). 2. O botão Pencil e o clique no nome chamam `onEdit(product.id)`. 3. Remover botão Eye (redundante — o edit já abre a ficha completa). Ajustar interface: `onEdit: (productId: string) => void` |

### Detalhe

**StoreProductsAdminPage.tsx:**
- Remover import de `StoreProductEditDialog`
- Importar `ProductDetailDialog` de `@/components/products/ProductDetailDialog`
- State: `const [editProductId, setEditProductId] = useState<string | null>(null)`
- Render: `<ProductDetailDialog open={!!editProductId} onOpenChange={(open) => { if (!open) setEditProductId(null); }} productId={editProductId!} />`
- Passar `onEdit={(id) => setEditProductId(id)}` ao `CatalogProductsTable`

**CatalogProductsTable.tsx:**
- Interface `onEdit` muda para `(productId: string) => void`
- Nome do produto: `<button onClick={() => onEdit(product.id)} className="hover:underline text-left">...</button>`
- Botão Pencil: `onClick={() => onEdit(product.id)}`
- Remover botão Eye (já não necessário)

