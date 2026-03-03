

# Mostrar SKU no dropdown de "Registar Cotação"

## Alteração

No ficheiro `src/pages/procurement/RFQDetailPage.tsx`, linha 471, o `SelectItem` do dropdown de itens mostra apenas o nome do produto. Vamos adicionar o SKU:

**Antes:** `{item.products?.name || "Produto"} (Qtd: {item.qty})`

**Depois:** `{item.products?.name || "Produto"} {item.products?.sku ? `[${item.products.sku}]` : ""} (Qtd: {item.qty})`

Também verificar se a query de `rfq_items` já traz o campo `sku` no select — segundo o código existente, já faz `select("*, products:product_id(name, sku)")`, portanto o campo já está disponível.

### Ficheiro a editar
- `src/pages/procurement/RFQDetailPage.tsx` — linha 471

