

# Fase 9 — Otimização para Alta Conversão (€10.000+/dia)

## Diagnóstico

A loja já tem uma base sólida: catálogo com infinite scroll, filtros, hero carousel, best sellers, deals, trust section, reviews, cross-sell, upsell no carrinho, wishlist, loyalty, cupões com countdown, comparação de produtos, AI advisor, sticky add-to-cart, free shipping bar, e checkout multi-step com Stripe.

**O que falta para atingir €10k/dia** (padrões Amazon/top e-commerce):

1. **Prova social em tempo real** — Notificações "João de Lisboa comprou X há 2 min" (FOMO)
2. **Urgência no produto** — Countdown de oferta no PDP e badges "Última unidade" mais agressivos
3. **Checkout otimizado** — Guest checkout simplificado, one-click buy, express checkout
4. **Recuperação de vendas** — Exit-intent popup com desconto, abandoned cart email trigger automático
5. **Mobile-first conversion** — Bottom bar com CTA fixo, swipe gallery, thumb-friendly layout
6. **AOV (Average Order Value) boosters** — Bundles visuais no PDP, volume discounts visíveis, progress bar de desconto
7. **Personalização** — Secção "Para Si" baseada em recently viewed + categoria
8. **Performance** — Image optimization, preload de páginas críticas

## Plano de Implementação

### 1. Live Sales Notification (FOMO Toast)
- Novo componente `StoreLiveSalesNotification.tsx`
- Polling a `store_orders` (últimas 24h) — mostra toast discreto "Maria comprou [produto] há 3 min"
- Rotação a cada 15-30s, max 1 visível, desaparece após 5s
- Integrar no `StorePage.tsx`

### 2. Urgency Engine no Produto
- Adicionar countdown timer ao Buy Box quando produto tem `pricing_rules` com `ends_at`
- Badge "Última unidade!" quando `stock_quantity === 1`
- Badge "Pouco stock — X restantes" mais proeminente (vermelho pulsante)
- Contador "X pessoas estão a ver agora" (já existe `recentViewers`, tornar mais visível)

### 3. Quick Buy / One-Click Purchase
- Botão "Comprar Agora" no Buy Box e no ProductCard (ao lado de "Adicionar ao Carrinho")
- Redireciona direto para checkout com item no carrinho
- No mobile: bottom bar fixa com preço + "Comprar Agora" (substituir sticky atual por versão mais conversion-oriented)

### 4. Exit-Intent Popup com Desconto
- Novo componente `StoreExitIntentPopup.tsx`
- Detecta mouse a sair do viewport (desktop) ou scroll rápido para cima (mobile)
- Mostra popup com desconto (ex: "Espere! 10% de desconto se comprar agora")
- Gera cupão temporário ou mostra cupão ativo existente
- Cookie para não mostrar mais de 1x por sessão

### 5. Volume Discount Display
- Mostrar tabela de descontos por quantidade no PDP (usando `pricing_rules` tipo "volume")
- Progress bar: "Compre mais X e ganhe Y% de desconto"
- Badge no card: "A partir de €X para 3+"

### 6. Mobile Conversion Bar
- Bottom bar fixa no PDP mobile: [Preço] [Comprar Agora] 
- Sticky, sempre visível, com animação de entrada
- Substitui/complementa a sticky bar atual com design mais agressivo

### 7. Personalização "Recomendado Para Si"
- Nova secção `StorePersonalizedSection.tsx` na homepage
- Baseada em `recentlyViewed` + categorias visitadas
- Mostra produtos da mesma categoria não vistos + trending

### 8. Cart Abandonment Trigger
- No checkout, quando o utilizador sai sem completar (beforeunload):
  - Guardar dados na tabela `checkout_abandoned_carts` (já existe)
  - Melhorar a captura: guardar mais cedo (no step 1 do checkout, ao introduzir email)
- Integrar com o sistema de recovery emails existente

### 9. Checkout Speed Optimizations
- Auto-fill de nome quando email já existe como contacto
- Remover campos opcionais do step 1 (mover telefone para step 2)
- Mostrar thumbnail dos produtos no resumo
- Adicionar "Garantia de segurança" visual mais forte

### 10. Performance & Conversão Visual
- `loading="eager"` para imagens above-the-fold
- Preload da página de produto quando hover no card (prefetch)
- Skeleton loading mais rápido
- Animação de "Adicionado ao carrinho" mais satisfatória (confetti micro-animation)

## Estrutura Técnica

```text
Novos componentes:
├── StoreLiveSalesNotification.tsx  (FOMO toast)
├── StoreExitIntentPopup.tsx        (exit-intent popup)
├── StoreVolumeDiscountTable.tsx    (tabela qty/preço)
├── StoreMobileConversionBar.tsx    (bottom CTA mobile)
├── StorePersonalizedSection.tsx    (recomendações)
├── StoreQuickBuyButton.tsx         (comprar agora)
└── StoreAddToCartAnimation.tsx     (micro-animação)

Ficheiros modificados:
├── StoreProductPage.tsx            (urgency, volume, quick buy)
├── StoreProductCard.tsx            (quick buy, prefetch)
├── StorePage.tsx                   (FOMO, personalização, exit-intent)
├── StoreCartDrawer.tsx             (animação melhorada)
├── StoreStickyAddToCart.tsx         (mobile redesign)
└── useCheckoutForm.ts              (early email capture)
```

## Critérios de Aceitação
- Toast de FOMO aparece a cada 20-30s com dados reais ou simulados
- Countdown visível no Buy Box para produtos com regras temporais
- Botão "Comprar Agora" funcional no card e no PDP
- Exit-intent popup aparece 1x por sessão ao sair
- Tabela de volume discounts visível quando existem pricing rules
- Mobile bottom bar sempre visível no PDP
- Secção personalizada na homepage com 4-8 produtos
- Email capturado no step 1 do checkout cria registo de abandoned cart
- Performance: LCP < 2.5s, imagens above-fold com eager loading

## Riscos
- FOMO agressivo demais pode parecer spam — usar design discreto e elegante
- Exit-intent em mobile é menos fiável — usar heurística de scroll
- Volume de dados para FOMO depende de haver encomendas reais

