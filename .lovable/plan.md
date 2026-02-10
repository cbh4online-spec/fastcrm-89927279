

# Redesign da Loja Online -- Experiencia Premium e Competitiva

## Visao Geral

Transformar a loja atual numa experiencia de e-commerce de nivel profissional, inspirada nas melhores praticas de grandes marketplaces mas com identidade visual propria e moderna. O objetivo e maximizar conversao atraves de hierarquia visual clara, prova social e urgencia estrategica.

---

## O Que Muda (Resumo Visual)

| Seccao | Antes | Depois |
|--------|-------|--------|
| Homepage | Hero estatico + lista simples | Hero com carrossel rotativo + grelha de "Quad Cards" por categoria + secao "Mais Vendidos" |
| Categorias | Carousel horizontal basico | Cards visuais com imagem de fundo, contagem de produtos e hover premium |
| Grelha de Produtos | Cards uniformes | Cards com indicador de popularidade, barra de stock visual e "Escolha Popular" |
| Pagina de Produto | Layout 2 colunas | Layout 3 zonas: Galeria / Info / Buy Box lateral com sticky scroll |
| Navegacao | Menu dropdown simples | Mega-menu com categorias visuais e produtos sugeridos |
| Prova Social | Apenas estrelas | Barra de progresso de ratings + "X pessoas estao a ver isto" + numero de vendas |

---

## Detalhe das Alteracoes

### 1. Homepage Redesenhada

**Hero Rotativo (substituir StoreHeroSection)**
- Carrossel automatico (3-5 slides) com transicao suave usando produtos em destaque
- Cada slide: imagem grande a esquerda, texto + CTA a direita
- Indicadores de progresso na base (dots + barra temporal)
- Design proprio: cantos arredondados generosos, gradientes suaves em vez do estilo "barra retangular" da Amazon

**Quad Cards de Categorias (novo componente)**
- Grelha de cards 2x2 ou 3x2 abaixo do hero
- Cada card tem: imagem de fundo com overlay, nome da categoria, contagem de produtos, CTA "Explorar"
- Visual: bordas arredondadas, sombra suave, efeito glass-morphism no texto

**Seccao "Mais Vendidos" (novo componente)**
- Ranking numerado (1, 2, 3...) com medalhas dourada/prateada/bronze nos top 3
- Horizontal scroll com cards compactos
- Badge de "Tendencia" em vez de copiar o "#1 Best Seller"

**Seccao "Novidades" (novo componente)**
- Grid de produtos adicionados nos ultimos 7 dias
- Badge "Novo" com animacao pulse
- Countdown se tiver oferta de lancamento

### 2. Product Card Melhorado (StoreProductCard)

- **Barra visual de stock**: Quando stock < 20, mostrar barra de progresso com "Quase a esgotar -- restam X"
- **Badge "Escolha Popular"**: Baseado em vendas (salesCounts > threshold)
- **Preco com poupanca**: Mostrar "Poupa X%" quando ha desconto
- **Hover mais rico**: Preview de 2a imagem no hover (se existir), transicao crossfade

### 3. Pagina de Produto Premium (StoreProductPage)

**Buy Box Lateral com Sticky**
- Coluna direita fixa (sticky) com: preco, stock, quantidade, botao "Adicionar ao Carrinho", estimativa de entrega
- Separada visualmente do conteudo informativo
- Fundo com borda e sombra leve para destacar a zona de compra

**Galeria Melhorada**
- Thumbnails verticais a esquerda da imagem principal (em vez de horizontais em baixo)
- Navegacao por setas dentro da imagem
- Contador "X de Y" no canto

**Seccao de Confianca Integrada**
- Dentro da Buy Box: icones compactos de "Entrega Gratis", "Devolucao Facil", "Pagamento Seguro"
- Formato inline com separadores verticais

**Indicador de Visualizacoes em Tempo Real**
- "X pessoas estao a ver este produto agora" (baseado em page views recentes)

### 4. Categorias com Impacto Visual (StoreCategoryCarousel)

- Substituir pills por cards com imagem de fundo da categoria
- Cada card: 120x80px com overlay gradiente, nome centrado
- Scroll horizontal com snap points

### 5. Mega-Menu Navegacao (StoreHeader)

- Expandir o menu de categorias para mostrar subcategorias + 2 produtos sugeridos
- Layout: coluna esquerda com lista de categorias, area direita com produto "Top" dessa categoria
- Transicao suave com framer-motion

### 6. Secao de Reviews Melhorada

- Barra horizontal de distribuicao de ratings (5 barras: 5 estrelas ate 1 estrela com percentagem)
- Destaque do review mais util ("Review mais votada")
- Fotos de clientes quando disponiveis

---

## Seccao Tecnica

### Ficheiros a Criar
- `src/components/store/sections/StoreHeroCarousel.tsx` -- Hero rotativo com autoplay
- `src/components/store/sections/StoreCategoryGrid.tsx` -- Quad cards de categorias com imagens
- `src/components/store/sections/StoreBestSellers.tsx` -- Ranking de mais vendidos
- `src/components/store/sections/StoreNewArrivals.tsx` -- Produtos novos nos ultimos 7 dias
- `src/components/store/StoreRatingBreakdown.tsx` -- Barras de distribuicao de ratings

### Ficheiros a Modificar
- `src/pages/store/StorePage.tsx` -- Integrar novos componentes na homepage
- `src/pages/store/StoreProductPage.tsx` -- Layout 3 zonas com Buy Box sticky
- `src/components/store/StoreProductCard.tsx` -- Barra de stock, hover com 2a imagem, badge popular
- `src/components/store/StoreHeader.tsx` -- Mega-menu expandido com produtos sugeridos
- `src/components/store/sections/StoreCategoryCarousel.tsx` -- Cards visuais com imagem
- `src/components/store/StoreReviewsSection.tsx` -- Rating breakdown bars

### Hooks e Dados
- Utilizar `useProductSalesCount` existente para ranking de mais vendidos
- Utilizar `store_page_views` para o contador "X pessoas a ver"
- Query de produtos criados nos ultimos 7 dias para "Novidades"
- Dados de categorias existentes (sem necessidade de novas tabelas)

### Dependencias
- Nenhuma nova dependencia -- tudo construido com framer-motion, Tailwind e Radix UI ja existentes

### Estrategia de Implementacao
1. Primeiro: novos componentes de homepage (Hero, Quad Cards, Best Sellers, Novidades)
2. Segundo: Product Card e Pagina de Produto melhorados
3. Terceiro: Mega-Menu e Categorias visuais
4. Quarto: Rating breakdown e prova social

