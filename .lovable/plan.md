

# product_inventory -- Inventario ja integrado no modelo actual

## Analise

Apos inspecao do codigo, o inventario ja esta implementado directamente na tabela `products` com as colunas:

- `track_stock` (boolean)
- `stock_quantity` (integer, nullable)
- `stock_status` (text -- 'available', 'limited', 'backorder', 'out_of_stock', 'in_stock')

O `product-quick-create` ja faz o INSERT destes campos (linhas 190-192):

```text
stock_quantity: inventory.quantity || null,
stock_status: inventory.track_stock ? "in_stock" : null,
track_stock: inventory.track_stock ?? false,
```

## Recomendacao

**Nao e necessaria nenhuma alteracao.** O modelo actual ja cobre o caso de uso descrito:

| Campo pedido | Mapeamento actual |
|---|---|
| `track_stock` (bool) | `products.track_stock` |
| `quantity` (int nullable) | `products.stock_quantity` |
| `in_stock` (bool) | Derivado de `stock_status` e `stock_quantity` |
| `updated_at` | `products.updated_at` |

A idempotencia do UPSERT e garantida pelo header `X-Idempotency-Key` ja implementado na Edge Function. Se o mesmo pedido for repetido, o produto existente e retornado sem duplicacao.

### Quando separar para tabela propria?

Uma tabela `product_inventory` separada faria sentido se:
- Houver variantes com stock independente (ja existe `product_variants.stock_quantity`)
- Multi-warehouse / multi-location
- Historico de movimentos de stock (stock ledger)

Nenhum destes cenarios esta activo, pelo que o modelo inline e suficiente.

## Resultado

Nenhum ficheiro a criar ou modificar. O fluxo actual ja esta correcto.

