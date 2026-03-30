

## Integração das Livrarias na Loja Online — Plano de Execução

### Resumo do diagnóstico

- **12 ficheiros** importam `useStoreCart` do `StoreCartContext`
- O carrinho usa `localStorage` com chave fixa `"store-cart"` (sem scoping por workspace)
- Cálculos monetários usam `number` nativo com `.toFixed(2)` em ~15 locais
- Sentry e PostHog já estão inicializados em `main.tsx`, mas sem eventos de loja
- Existe `src/lib/currency.ts` com `currency.js` — complementar, não conflituoso
- Validação de email/telefone no checkout é básica (apenas `length >= 9` para telefone, `type="email"` nativo)

---

### FASE A — Money Layer (`src/lib/money.ts`)

**Criar** `src/lib/money.ts` com helpers baseados em `decimal.js`:
- `toMoney`, `moneyAdd`, `moneySub`, `moneyMul`, `moneyMin`, `moneyMax`, `moneyToNumber`, `formatMoney`

**Aplicar** nos cálculos críticos de:
- `StoreCartContext.tsx` / novo zustand store — subtotal
- `StoreCheckoutPage.tsx` — `discountAmount`, `giftCardAmount`, `effectiveShippingCost`, `finalTotal`
- `StoreCartDrawer.tsx` — line total (`item.price * item.quantity`) e subtotal display

Não alterar `src/lib/currency.ts` existente.

---

### FASE B — Cart Store Zustand (`src/stores/useStoreCartStore.ts`)

**Criar** `src/stores/useStoreCartStore.ts`:
- Zustand store com `persist` middleware
- Chave dinâmica: `store-cart:<workspaceSlug>` (recebido como parâmetro na criação)
- Estado: `items`, `totalItems`, `subtotal` (decimal.js), `isOpen`
- Ações: `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `setIsOpen`
- Sync debounced para `store_visitor_sessions` (migrar lógica do context)

**Adaptar** `StoreCartContext.tsx`:
- Transformar em wrapper fino que lê `workspaceSlug` dos params e delega ao zustand store
- Manter export `useStoreCart` e `StoreCartProvider` — **zero alterações** nos 12 consumidores

---

### FASE C — Validação de Checkout

**Alterar** `StoreCheckoutPage.tsx`:
- Step 1: validar telefone com `parsePhoneNumber` do `libphonenumber-js` (default country `PT`)
- Step 2: validar email com `validator.isEmail()`
- Mostrar mensagens de erro inline (state `errors` por campo)
- Substituir cálculos monetários inline por helpers de `money.ts`
- Não alterar layout nem chamadas ao backend

---

### FASE D — Sentry nos Pontos Críticos

**Alterar** `StoreCheckoutPage.tsx`:
- Wrap `handleSubmit` catch com `Sentry.captureException`

**Alterar** zustand store (cart sync):
- Wrap erro de sync com `Sentry.captureException`

**Alterar** `useResolveStoreWorkspace` (se aplicável):
- Capturar falha de resolução

Usar import condicional: `import { Sentry } from "@/lib/sentry"` (já existe e é no-op sem DSN).

---

### FASE E — PostHog Analytics (`src/lib/analytics.ts`)

**Criar** `src/lib/analytics.ts`:
- Wrapper `trackEvent(name, props)` que chama `posthog.capture()` se inicializado
- Fallback silencioso sem config

**Adicionar eventos em:**

| Evento | Ficheiro |
|---|---|
| `product_view` | `StoreProductPage.tsx` |
| `add_to_cart` | Zustand store `addItem` |
| `remove_from_cart` | Zustand store `removeItem` |
| `begin_checkout` | `StoreCheckoutPage.tsx` (mount) |
| `apply_coupon` | `StoreCheckoutPage.tsx` |
| `apply_gift_card` | `StoreCheckoutPage.tsx` |
| `checkout_submit` | `StoreCheckoutPage.tsx` |
| `checkout_redirect_stripe` | `StoreCheckoutPage.tsx` |
| `purchase_success_page_view` | `StoreSuccessPage.tsx` |
| `cart_cleared` | Zustand store `clearCart` |

Propriedades: `workspaceSlug`, `productId`, `productName`, `quantity`, `subtotal`, `total`, `currency` (conforme aplicável).

---

### FASE F — Compatibilidade

- `useStoreCart` e `StoreCartProvider` mantêm assinatura — nenhum dos 12 consumidores precisa de alteração de import
- Não tocar em design, backend Stripe, Typesense, A/B testing
- Build validado no final

### Ficheiros a criar (3)
1. `src/lib/money.ts`
2. `src/stores/useStoreCartStore.ts`
3. `src/lib/analytics.ts`

### Ficheiros a alterar (4)
1. `src/contexts/StoreCartContext.tsx` — wrapper fino do zustand
2. `src/pages/store/StoreCheckoutPage.tsx` — validação + money + Sentry + PostHog
3. `src/pages/store/StoreProductPage.tsx` — evento `product_view`
4. `src/pages/store/StoreSuccessPage.tsx` — evento `purchase_success_page_view`

### Riscos
- A chave dinâmica do zustand persist requer que o `workspaceSlug` esteja disponível no momento da criação do store — resolvido via factory function
- `StoreCartDrawer` mostra `subtotal.toFixed(2)` — como o subtotal passa a ser `number` (via `moneyToNumber`), mantém-se compatível

