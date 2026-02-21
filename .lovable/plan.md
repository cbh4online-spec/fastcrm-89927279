
# Fix: Stripe SaaS - Checkout e Mapeamento de Planos

## Problemas Encontrados

### 1. Checkout SaaS nao funciona (critico)
O frontend (`SubscriptionContext.createCheckout`) envia `{ plan: "basic", workspaceId }` mas a edge function `create-checkout` espera `{ priceId: "price_xxx", workspaceId }`. Alem disso, a funcao `create-checkout` tenta ler a chave Stripe de `workspace_stripe_config` (que esta **vazia** - 0 registos), quando deveria usar a `STRIPE_SECRET_KEY` global do ambiente (que e a chave do SaaS/plataforma).

### 2. Arquitectura Stripe inconsistente
- **SaaS billing** (`create-checkout`, `check-subscription`, `stripe-webhook`): Deve usar `STRIPE_SECRET_KEY` global (chave da plataforma)
- **Merchant billing** (`create-store-checkout`, `create-c2c-checkout`, etc.): Usa correctamente `workspace_stripe_config` (chave do cliente)
- O `create-checkout` esta a usar `workspace_stripe_config` por engano

### 3. Preco Agency duplicado no Stripe
Existem dois precos para Agency: 199EUR e 399EUR. O de 199EUR corresponde ao definido no `PLAN_INFO`.

## Dados Stripe Actuais

| Plano | Produto | Preco ID | Valor |
|-------|---------|----------|-------|
| Basic | prod_Tn6lMOO7zRREaL | price_1SpWYGQpSN9dntDnbou09co0 | 29 EUR/mes |
| Pro | prod_Tn6mQSM7DNs1TO | price_1SpWYwQpSN9dntDneKmQwHUU | 79 EUR/mes |
| Agency | prod_Tn6mBblFLd6lD2 | price_1SpWZ8QpSN9dntDnMeNvHIVO | 199 EUR/mes |

## Alteracoes

### Ficheiro 1: `supabase/functions/create-checkout/index.ts`
Reescrever para:
- Usar `STRIPE_SECRET_KEY` global (nao workspace_stripe_config)
- Aceitar `plan` em vez de `priceId`
- Mapear internamente plan -> price ID
- Remover dependencia de `workspace_stripe_config`

```text
Mapeamento interno:
  basic  -> price_1SpWYGQpSN9dntDnbou09co0
  pro    -> price_1SpWYwQpSN9dntDneKmQwHUU
  agency -> price_1SpWZ8QpSN9dntDnMeNvHIVO
```

### Ficheiro 2: `src/contexts/SubscriptionContext.tsx`
Nenhuma alteracao necessaria - ja envia `{ plan, workspaceId }` correctamente.

### Resultado
- O botao "Escolher plano" nos PricingCards abre o Stripe Checkout correctamente
- O check-subscription ja funciona (usa STRIPE_SECRET_KEY global)
- O stripe-webhook ja funciona (usa STRIPE_SECRET_KEY global)
- O customer-portal ja funciona (usa STRIPE_SECRET_KEY global)
- Fluxo completo: Escolher plano -> Stripe Checkout -> Webhook actualiza workspace_subscriptions -> check-subscription le o estado
