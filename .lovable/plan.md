

## Estrategias de Venda tipo Amazon

### Visao geral

Vamos implementar as principais tacticas de conversao que a Amazon usa, adaptadas a tua loja. Estas estrategias aumentam o valor medio do carrinho e criam urgencia na compra.

---

### 1. "Frequentemente comprados juntos" (Cross-sell)

Na pagina de produto, mostrar um bloco com 2-3 produtos da mesma categoria que complementam o produto atual. Formato visual tipo Amazon com imagens ligadas por "+" e botao "Adicionar todos ao carrinho".

- Baseia-se na mesma `store_category_id` do produto atual
- Exclui o produto em visualizacao
- Maximo 3 produtos sugeridos

### 2. "Clientes tambem viram" (Produtos relacionados)

Secao horizontal no fundo da pagina de produto com scroll, mostrando produtos da mesma categoria ou com precos semelhantes.

### 3. Urgencia e escassez

- **Stock baixo**: Quando `stock_quantity` <= 5 e `track_stock = true`, mostrar badge vermelho "Apenas X em stock!" no card e na pagina de produto
- **Contador de vendas**: Badge "X vendidos" baseado em contagem de `store_order_items` (opcional, se dados existirem)

### 4. Badges e etiquetas inteligentes

No `StoreProductCard` e na pagina de produto:
- **"Novo"** -- produtos criados nos ultimos 7 dias
- **"Mais vendido"** -- produtos com mais encomendas (futuro, baseado em dados reais)
- **"Ultima unidade!"** -- stock_quantity = 1
- **"Pouco stock"** -- stock_quantity <= 5
- **"Oferta"** -- quando ha preco com desconto (tier pricing)

### 5. Upsell no carrinho

No `StoreCartDrawer`, antes do botao "Finalizar Compra":
- Mostrar 1-2 produtos populares que nao estao no carrinho
- Label: "Pode tambem gostar" com botao rapido de adicionar

### 6. Faixa de "Frete gratis" (incentivo)

Barra de progresso no carrinho:
- "Faltam EUR X para envio gratis!" (threshold configuravel, ex: EUR 50)
- Quando atingido: "Parabens! Envio gratis!"
- Cria motivacao para aumentar o valor do carrinho

---

### Detalhes tecnicos

**Ficheiros a modificar:**

| Ficheiro | Alteracao |
|----------|-----------|
| `StoreProductPage.tsx` | Adicionar seccoes "Comprados juntos" e "Tambem viram" |
| `StoreProductCard.tsx` | Badges inteligentes (Novo, Pouco stock, Oferta) |
| `StoreCartDrawer.tsx` | Upsell de produtos + barra de progresso frete gratis |
| `StorePage.tsx` | Badges nos cards do catalogo |

**Ficheiros novos:**

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/store/sections/StoreBoughtTogether.tsx` | Bloco cross-sell "Comprados juntos" |
| `src/components/store/sections/StoreRelatedProducts.tsx` | Carrossel "Tambem viram" |
| `src/components/store/StoreCartUpsell.tsx` | Sugestoes de upsell no carrinho |
| `src/components/store/StoreFreeShippingBar.tsx` | Barra de progresso de frete gratis |
| `src/components/store/StoreProductBadges.tsx` | Componente reutilizavel de badges |

**Sem alteracoes de base de dados** -- todas as estrategias usam dados ja existentes (categoria, stock, preco, data de criacao, featured).

**Logica de "Comprados juntos":**
```text
1. Obter store_category_id do produto atual
2. Query: produtos da mesma categoria, store_published=true, id != produto_atual
3. Limitar a 3 resultados, ordenar por store_sort_order
4. Mostrar com visual "Produto A + Produto B + Produto C = Total EUR X"
```

**Logica de badges:**
```text
- "Novo": created_at > (now - 7 dias)
- "Pouco stock": track_stock=true AND stock_quantity <= 5 AND stock_quantity > 0
- "Ultima unidade": track_stock=true AND stock_quantity = 1
- "Oferta": isDiscounted=true (tier pricing ativo)
```

