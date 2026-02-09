

# Frontoffice da Loja - Estrategia Amazon

Analise das melhores praticas da Amazon aplicadas ao frontoffice da loja, com foco em conversao, experiencia do utilizador e profissionalismo visual.

---

## O que a Amazon faz (e falta na loja atual)

### Elementos Amazon que ja existem
- Carrinho com upsell ("Pode tambem gostar")
- Secao "Comprados Juntos" (cross-sell)
- "Clientes tambem viram" (produtos relacionados)
- Badges de escassez (ultima unidade, pouco stock)
- Barra de frete gratis com progresso
- Reviews com compra verificada
- Lista de desejos

### Elementos Amazon em falta

1. **"Frequently Bought Together" com checkbox** - Na Amazon, o utilizador pode selecionar/deselecionar itens do bundle, nao e so "adicionar todos"
2. **Rating stars nos cards do catalogo** - Os cards nao mostram estrelas/avaliacoes, elemento critico de prova social
3. **Contador de reviews nos cards** - "(47 avaliacoes)" nos cards como na Amazon
4. **Secao "Visto recentemente"** - Historico local de produtos visitados, aparece na homepage e nas paginas de produto
5. **"Compre outra vez"** - Produtos ja comprados anteriormente (para clientes recorrentes)
6. **Countdown/urgencia temporal** - Timer de oferta limitada ao lado do preco (como "Oferta termina em 2h 15m")
7. **Bullet points estilo Amazon** - Na pagina de produto, lista de features ao lado da imagem (nao abaixo)
8. **Sticky "Add to Cart" bar** - Barra fixa no topo ao fazer scroll para baixo na pagina de produto (mobile e desktop)
9. **Zoom de imagem on hover** - Lupa/zoom na imagem principal do produto
10. **Video do produto** - Player de video demo inline na galeria de imagens
11. **Delivery estimation** - "Entrega estimada: Ter, 12 Fev" ao lado do botao de compra
12. **Quantidade vendida social proof** - "500+ vendidos no ultimo mes" ou "10 pessoas estao a ver agora"
13. **"Deals" / Ofertas do dia na homepage** - Secao com countdown e produtos em promocao
14. **Navegacao por categorias tipo mega-menu** - Menu expandido com categorias e subcategorias
15. **Breadcrumbs melhorados** - Com links reais para categorias

---

## Plano de Implementacao (priorizado por impacto na conversao)

### Fase 1: Social Proof e Urgencia (maior impacto em conversao)

**1.1 Stars + review count nos product cards**
- Carregar review stats (media + count) por produto
- Mostrar 5 estrelas + "(X)" nos cards do catalogo
- Nova query otimizada para buscar stats em batch para todos os produtos visiveis

**1.2 "Visto recentemente" (localStorage)**
- Guardar ultimos 10 produtos visitados em localStorage
- Nova secao `StoreRecentlyViewed` na homepage (abaixo do catalogo)
- Tambem aparece na pagina de produto, abaixo dos relacionados

**1.3 Social proof "X vendidos"**
- Contar encomendas pagas por produto
- Badge "50+ vendidos" nos cards e pagina de produto
- Criar hook `useProductSalesCount`

**1.4 Secao "Ofertas do Dia" na homepage**
- Buscar produtos com desconto ativo (tier pricing ou featured)
- Countdown timer ate meia-noite
- Cards com badge vermelha de % desconto e preco riscado

### Fase 2: Experiencia de Produto (pagina de produto Amazon-like)

**2.1 Zoom de imagem**
- On hover na imagem principal, mostrar lupa com zoom 2x
- Em mobile, tap para fullscreen com pinch-to-zoom (dialog)

**2.2 Video na galeria**
- Se `demo_video_url` existe, mostrar como primeiro item na galeria
- Player inline com thumbnail

**2.3 Sticky "Add to Cart" bar**
- Barra fixa que aparece quando o botao original sai do viewport
- Mostra: imagem mini + nome + preco + botao "Adicionar"
- Usa IntersectionObserver para toggle

**2.4 Delivery estimation**
- Texto "Entrega estimada: [data +3 dias uteis]" junto ao botao
- Icone de camiao com data formatada

**2.5 Bought Together com checkboxes**
- Cada item do bundle tem checkbox selecionavel
- Preco total atualiza em tempo real conforme selecao
- Layout horizontal com "+" entre itens (ja existe, melhorar)

### Fase 3: Homepage Premium

**3.1 Mega-menu de categorias**
- No header, hover sobre "Categorias" abre painel com todas as categorias
- Com icones e contagem de produtos por categoria

**3.2 Carrossel horizontal de categorias**
- Faixa com cards de categorias (icone + nome) abaixo do hero
- Scroll horizontal em mobile, grid em desktop

**3.3 Secao "Novidades"**
- Produtos criados nos ultimos 7 dias, em carrossel
- Badge "Novo" automatico

### Fase 4: Melhorias de Footer e Confianca

**4.1 Footer completo Amazon-style**
- 4 colunas: Sobre Nos, Ajuda, Categorias, Legal
- Links para wishlist, encomendas, contacto
- Back-to-top button

**4.2 Barra de pagamento seguro**
- Icones de metodos de pagamento (Visa, Mastercard, etc.)
- SSL badge, garantia de devolucao

---

## Detalhes Tecnicos

### Ficheiros a criar
- `src/components/store/sections/StoreRecentlyViewed.tsx` - Historico de produtos visitados
- `src/components/store/sections/StoreDealsSection.tsx` - Ofertas do dia com countdown
- `src/components/store/sections/StoreCategoryCarousel.tsx` - Carrossel de categorias
- `src/components/store/StoreImageZoom.tsx` - Componente de zoom de imagem
- `src/components/store/StoreStickyAddToCart.tsx` - Barra sticky de add to cart
- `src/components/store/StoreFooter.tsx` - Footer completo
- `src/components/store/StoreMegaMenu.tsx` - Mega menu de categorias
- `src/hooks/useRecentlyViewed.ts` - Hook para historico local
- `src/hooks/useProductSalesCount.ts` - Hook para contagem de vendas

### Ficheiros a modificar
- `src/components/store/StoreProductCard.tsx` - Adicionar stars, review count, "X vendidos"
- `src/pages/store/StoreProductPage.tsx` - Zoom, video, sticky bar, delivery estimate, bought together melhorado
- `src/pages/store/StorePage.tsx` - Novas secoes (recently viewed, deals, category carousel, footer)
- `src/components/store/StoreHeader.tsx` - Mega menu de categorias
- `src/components/store/sections/StoreBoughtTogether.tsx` - Checkboxes de selecao

### Queries novas
- Review stats em batch (media + count por array de product_ids)
- Sales count por produto (COUNT de store_orders pago por produto)
- Produtos com desconto ativo

### Dependencias
- Nenhuma nova - usa recharts, framer-motion, radix e lucide ja instalados

