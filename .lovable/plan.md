

# Sistema Completo de Checkout com Upsell/Downsell — Plano de Implementação (5 Fases)

O documento define um sistema de checkout de classe mundial com upsells, downsells, order bumps, carrinhos abandonados, bundles, A/B testing e analytics. Stripe já está configurado (STRIPE_SECRET_KEY disponível). O checkout C2C existente (`create-c2c-checkout`) já funciona com Stripe Checkout Sessions.

---

## Fase 1 — Core: Tabelas + Checkout + Order Bumps + Tracking

### Database (1 migration)
Criar 10 tabelas com RLS:
- `checkout_funnels` — funis de checkout por workspace
- `checkout_funnel_steps` — passos do funil (checkout, upsell, downsell, thank_you)
- `checkout_offers` — ofertas (upsell, downsell, cross-sell, order_bump, bundle)
- `checkout_order_bumps` — bumps no checkout (posição, condições, visual)
- `checkout_offer_sequences` — sequências de ofertas
- `checkout_one_click_tokens` — tokens para one-click upsell pós-compra
- `checkout_abandoned_carts` — carrinhos abandonados com recovery status
- `checkout_dynamic_discounts` — descontos dinâmicos (exit intent, timer)
- `checkout_quantity_breaks` — descontos por volume
- `checkout_smart_bundles` — bundles inteligentes
- `checkout_sessions` — sessões de analytics
- `checkout_ab_tests` — A/B tests

Índices para performance em workspace_id, slug, email, status.

### Edge Functions
- `checkout-create-session` — cria sessão, calcula bumps elegíveis, quantity breaks, bundles sugeridos
- `checkout-process-payment` — valida sessão, processa pagamento Stripe, cria order, gera one-click token, determina próximo step

### Frontend
- `src/pages/checkout/CheckoutPage.tsx` — página pública multi-step (Info → Shipping → Payment)
- `src/components/checkout/CheckoutForm.tsx` — formulário com validação
- `src/components/checkout/OrderSummary.tsx` — sidebar com totais, bumps, cupão
- `src/components/checkout/OrderBumpCard.tsx` — card de order bump com checkbox
- `src/components/checkout/TrustBadges.tsx` — badges de confiança
- `src/components/checkout/CountdownTimer.tsx` — timer de urgência
- `src/components/checkout/ScarcityIndicator.tsx` — indicador de escassez

### Admin
- `src/pages/dashboard/checkout/CheckoutFunnelsPage.tsx` — lista de funis
- `src/pages/dashboard/checkout/CheckoutFunnelEditPage.tsx` — editar funil + steps
- Hooks: `useCheckoutFunnels`, `useCheckoutOffers`, `useCheckoutSessions`

---

## Fase 2 — Upsells/Downsells + One-Click

### Edge Functions
- `checkout-process-upsell` — aceitar/recusar oferta, cobrar com one-click token, determinar próximo step
- `checkout-get-upsell-page` — carregar dados da oferta para renderizar

### Frontend
- `src/pages/checkout/UpsellPage.tsx` — página full-screen de upsell (headline, vídeo/imagem, bullet points, countdown, CTA)
- `src/pages/checkout/DownsellPage.tsx` — alternativa mais barata quando recusa upsell
- `src/components/checkout/UpsellAcceptButton.tsx` — CTA forte ("Sim! Adicionar à minha encomenda")
- `src/components/checkout/UpsellDeclineButton.tsx` — link discreto ("Não, não quero poupar €X")
- `src/components/checkout/UpsellGuarantee.tsx` — bloco de garantia
- `src/components/checkout/UpsellTestimonial.tsx` — testemunho com foto e rating

### Admin
- `src/pages/dashboard/checkout/CheckoutOffersPage.tsx` — lista/criar ofertas
- `src/pages/dashboard/checkout/CheckoutOfferEditPage.tsx` — editor com preview

---

## Fase 3 — Recovery + Exit Intent + Descontos Dinâmicos

### Edge Functions
- `checkout-track-abandoned` — registar carrinho abandonado quando utilizador sai
- `checkout-recover-cart` — cron que envia emails de recovery (1h, 24h, 72h com descontos progressivos)
- `checkout-apply-dynamic-discount` — verificar descontos dinâmicos e gerar códigos

### Frontend
- `src/components/checkout/ExitIntentPopup.tsx` — popup ao tentar sair (desconto, countdown, email capture)
- `src/pages/checkout/RecoverCartPage.tsx` — página de recuperação via token
- Hook `useExitIntent` — detecta movimento do rato para fora

### Admin
- `src/pages/dashboard/checkout/AbandonedCartsPage.tsx` — tabela de carrinhos abandonados com status de recovery
- `src/pages/dashboard/checkout/DynamicDiscountsPage.tsx` — configurar descontos dinâmicos

---

## Fase 4 — Bundles + Quantity Breaks + A/B Testing

### Frontend
- `src/components/checkout/QuantityBreakIndicator.tsx` — tabela de breaks com "Adiciona mais X para poupar Y%"
- `src/components/checkout/SmartBundleCard.tsx` — card de bundle ("Compra junto e poupa!")
- `src/pages/dashboard/checkout/BundlesPage.tsx` — gestão de bundles
- `src/pages/dashboard/checkout/ABTestsPage.tsx` — criar/ver A/B tests com significância estatística

### Edge Functions
- `checkout-ai-recommend-upsells` — usa Lovable AI (gemini-2.5-flash) para recomendar upsells baseado no carrinho e histórico

---

## Fase 5 — Analytics + Thank You Page

### Frontend
- `src/pages/checkout/ThankYouPage.tsx` — confirmação com confetti, order summary, cross-sells finais, social share
- `src/components/checkout/PostPurchaseCrossSell.tsx` — "Clientes que compraram isto também compraram..."
- `src/components/checkout/SocialProofPopup.tsx` — popup de vendas recentes
- `src/pages/dashboard/checkout/CheckoutAnalyticsPage.tsx` — dashboard com KPIs (conversão, AOV, upsell rate), funil visualization, performance por oferta

### Edge Functions
- `checkout-compute-analytics` — calcula métricas agregadas

---

## Routing (App.tsx)
Novas rotas:
- `/checkout/:funnelSlug` — checkout público
- `/checkout/:funnelSlug/upsell/:offerId` — upsell
- `/checkout/:funnelSlug/downsell/:offerId` — downsell
- `/checkout/:funnelSlug/thank-you` — confirmação
- `/checkout/recover/:token` — recuperação de carrinho
- `/dashboard/checkout` — lista de funis
- `/dashboard/checkout/offers` — ofertas
- `/dashboard/checkout/abandoned` — carrinhos abandonados
- `/dashboard/checkout/bundles` — bundles
- `/dashboard/checkout/analytics` — analytics
- `/dashboard/checkout/ab-tests` — A/B tests

## Navegação (nav.v2.ts)
Novo grupo "Checkout" no menu lateral com sub-itens.

## Notas técnicas
- Stripe já está configurado — STRIPE_SECRET_KEY disponível
- Usar `as any` pattern para tabelas novas (consistente com o projeto)
- Edge functions usam workspace Stripe config (`workspace_stripe_config`) já existente
- Resend API Key disponível para emails de recovery
- Lovable AI disponível para recomendações (sem API key extra)

