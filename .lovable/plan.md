

# Indicadores Visuais na Tabela da Loja

## Solução

Adicionar 3 ícones compactos com tooltip na coluna "Produto" (abaixo do SKU) indicando estado de imagens, variantes e stock. Sem coluna extra — mantém a tabela limpa.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/store/admin/useStoreAdminProducts.ts` | Adicionar contagem de variantes via sub-query `product_variants(count)` e expor `variants_count` no tipo |
| `src/components/store/admin/CatalogProductsTable.tsx` | Renderizar 3 ícones com tooltip abaixo do nome/SKU: Imagens, Variantes, Stock |

### Detalhe

**useStoreAdminProducts.ts:**
- Query: adicionar `product_variants(count)` ao select
- Tipo `ProductStoreData`: adicionar `variants_count: number`
- Mapear: `variants_count: item.product_variants?.[0]?.count || 0`

**CatalogProductsTable.tsx:**
- Importar `ImageIcon`, `Layers`, `PackageCheck` do lucide + `Tooltip` do shadcn
- Na célula do produto, após o SKU, renderizar uma linha de 3 ícones (14px):
  - **Imagens** (`ImageIcon`): verde se `images?.length > 0`, cinza/vermelho se vazio
  - **Variantes** (`Layers`): azul com count se > 0, cinza se 0
  - **Stock** (`PackageCheck`): cor conforme `stock_status` (verde=available, amber=limited, vermelho=out_of_stock, azul=backorder), cinza se null
- Cada ícone envolto em `Tooltip` com label descritivo (ex: "3 imagens", "Sem variantes", "Stock limitado")

