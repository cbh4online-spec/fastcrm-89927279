
# Fase 2 -- Product Card Melhorado, Pagina de Produto Premium e Reviews

## Resumo

Esta fase foca-se em 3 areas: melhorar o Product Card com indicadores visuais de stock e popularidade, redesenhar a pagina de produto com layout de 3 zonas (Galeria | Info | Buy Box sticky), e adicionar barras de distribuicao de ratings na seccao de reviews.

---

## 1. Product Card Melhorado (StoreProductCard.tsx)

**Barra visual de stock**: Quando `track_stock` esta ativo e `stock_quantity < 20`, mostrar uma mini barra de progresso abaixo do preco com texto "Quase a esgotar - restam X".

**Badge "Escolha Popular"**: Quando o produto tem mais de 25 vendas (via `salesCounts`), exibir badge dourado com icone de tendencia.

**Preco com poupanca**: Quando ha desconto, mostrar "Poupa X%" calculado a partir da diferenca entre `base_price` e `effectivePrice`.

**Hover com 2a imagem**: Se o produto tem mais de 1 imagem, no hover a imagem principal faz crossfade para a segunda imagem. Transicao CSS suave.

---

## 2. Pagina de Produto Premium (StoreProductPage.tsx)

**Layout 3 Zonas (apenas em desktop `lg:`):**

```text
+-------------------+-------------------+-----------------+
|  Galeria           |  Informacao       |  Buy Box        |
|  (thumbnails       |  (titulo, stars,  |  (preco, stock, |
|   verticais a      |   descricao,      |   qty, botao,   |
|   esquerda)        |   beneficios,     |   entrega,      |
|                    |   specs)          |   trust)        |
|                    |                   |  [sticky]       |
+-------------------+-------------------+-----------------+
```

- Em mobile mantém o layout atual empilhado (1 coluna)
- Em tablet usa 2 colunas (galeria + info/buybox juntos)
- Em desktop `lg:` usa grid de 3 colunas com a Buy Box na coluna direita com `sticky top-24`

**Galeria com thumbnails verticais:**
- Em desktop, as thumbnails passam de horizontais (em baixo) para verticais (a esquerda da imagem principal)
- Navegacao mantida com setas e contador "X de Y"

**Indicador de visualizacoes:**
- Texto "X pessoas viram este produto recentemente" baseado nos dados de `store_page_views` (ultimas 24h)
- Query simples com contagem de page views recentes

**Seccao de confianca dentro da Buy Box:**
- Icones compactos inline: Entrega Gratis | Devolucao Facil | Pagamento Seguro
- Separadores verticais entre cada item

---

## 3. Rating Breakdown (StoreRatingBreakdown.tsx -- NOVO)

Componente que mostra a distribuicao de ratings com 5 barras horizontais:

```text
5 estrelas  ████████████████  68%
4 estrelas  ████████          24%
3 estrelas  ███               5%
2 estrelas  █                 2%
1 estrela   █                 1%
```

- Integrado na `StoreReviewsSection.tsx` acima da lista de reviews
- Cada barra e clicavel para filtrar reviews por essa classificacao
- Media grande com numero e estrelas ao lado

---

## Seccao Tecnica

### Ficheiro a Criar
- `src/components/store/StoreRatingBreakdown.tsx`

### Ficheiros a Modificar
- `src/components/store/StoreProductCard.tsx` -- adicionar barra de stock, badge popular, hover 2a imagem, badge de poupanca
- `src/pages/store/StoreProductPage.tsx` -- layout 3 colunas com Buy Box sticky, thumbnails verticais, contador de views
- `src/components/store/StoreReviewsSection.tsx` -- integrar o RatingBreakdown

### Hook de Page Views (inline)
- Query simples ao `store_page_views` com filtro de ultimas 24h para contar visualizacoes recentes do produto

### Sem novas tabelas ou migracoes
- Todos os dados necessarios ja existem nas tabelas `store_page_views`, `store_reviews` e `products`

### Sem novas dependencias
- Tudo com Tailwind, framer-motion e componentes UI existentes
