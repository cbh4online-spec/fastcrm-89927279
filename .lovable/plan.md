
# Fase 10 — Completar Conversão + Checkout Ultra-Otimizado + Sales Analytics

## O que ficou por completar da Fase 9
1. **Email no Step 1 do checkout** — O schema foi atualizado mas o UI do `CheckoutLeadStep` ainda não mostra o campo email
2. **Urgency countdown no Buy Box** — Falta countdown de `pricing_rules` com `ends_at` no PDP
3. **Prefetch de produto no hover** — Card ainda não faz prefetch

## Fase 10 — Novas funcionalidades

### 1. Checkout Step 1 com Email (corrigir)
- Adicionar campo email ao `CheckoutLeadStep.tsx`
- Step 2 passa a ser só envio + pagamento (sem email)
- Captura email mais cedo para abandoned cart recovery

### 2. Urgency Countdown no Buy Box
- Quando produto tem `pricing_rules` com `ends_at`, mostrar countdown no Buy Box
- "Oferta termina em X:XX:XX" com animação pulsante
- Novo componente `StoreOfferCountdown.tsx`

### 3. Product Card Prefetch
- Ao fazer hover no card, prefetch dos dados do produto via `queryClient.prefetchQuery`
- Navegação instantânea para PDP

### 4. Dashboard de Vendas da Loja
- Nova tab "Vendas" no painel admin com:
  - Revenue diário/semanal/mensal (LineChart)
  - Top 10 produtos vendidos (BarChart)
  - Taxa de conversão (visitors → orders)
  - AOV (Average Order Value) trend
  - Carrinhos abandonados vs convertidos
- Hook `useStoreAnalytics` que agrega dados de `store_orders`

### 5. Checkout UX Polish
- Thumbnails dos produtos no summary card
- Badges de segurança mais proeminentes
- Animação de progresso entre steps
- Auto-focus inteligente

### 6. Abandoned Cart Dashboard
- Listar carrinhos abandonados no admin
- Ver contacto + items + valor
- Ação rápida de reenviar email de recuperação

## Ficheiros

```
Novos:
├── StoreOfferCountdown.tsx          (countdown urgency)
├── StoreSalesAnalytics.tsx          (dashboard vendas)
├── useStoreAnalytics.ts             (hook dados vendas)
├── StoreAbandonedCartsTab.tsx       (admin abandoned carts)

Modificados:
├── CheckoutLeadStep.tsx             (+ campo email)
├── CheckoutPaymentStep.tsx          (remover email, só envio+pagamento)
├── StoreProductCard.tsx             (prefetch on hover)
├── StoreProductPage.tsx             (countdown urgency)
├── CheckoutSummaryCard.tsx          (thumbnails)
```

## Critérios de Aceitação
- Email capturado no step 1 do checkout
- Countdown visível quando produto tem regra com data de fim
- Prefetch funcional — PDP abre instantaneamente após hover
- Dashboard de vendas com 4+ KPIs e gráficos
- Abandoned carts listados com ações rápidas
