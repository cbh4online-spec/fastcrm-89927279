

## Motor Transacional Backend — Plano de Execução

### Diagnóstico

**Estado atual:**
- `create-store-checkout` já valida produtos e stock no backend, mas **não valida cupões** — aceita apenas `giftCardCode`
- Gift cards são **debitados imediatamente** antes da confirmação de pagamento (linhas 304-377) — risco de perda de saldo se Stripe falhar
- O webhook `stripe-webhook` **não tem qualquer lógica para `source: "store"`** — encomendas da loja nunca são atualizadas para `paid`
- Não há tratamento de `checkout.session.expired` nem `payment_intent.payment_failed`
- `store_orders` já tem `coupon_id`, `discount_amount`, `shipping_cost`, `stripe_session_id`, `contact_id`
- `stripe_event_log` já existe com idempotência por `stripe_event_id`
- `store_order_events` já existe com trigger automático em mudanças de status
- Ambas as functions usam `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS)

**Problemas críticos a resolver:**
1. Gift card debitado antes da confirmação Stripe → risco de perda de saldo
2. Cupões nunca validados no backend
3. Webhook ignora encomendas da loja
4. Sem idempotência para eventos de loja no webhook

---

### Ficheiros a criar (2)

#### 1. `supabase/functions/_shared/store-pricing.ts`
Motor de cálculo server-side com funções:
- `resolveStoreProducts(supabase, workspaceId, items[])` — busca preços reais da DB, valida status/stock
- `validateCoupon(supabase, workspaceId, couponCode, customerEmail, subtotal, categoryIds[])` — valida atividade, expiração, `max_uses`, `single_use_per_customer`, `min_order_amount`, `category_ids`
- `calculateDiscount(coupon, subtotal, eligibleSubtotal)` — aplica `percentage`/`fixed`, respeita `max_discount_amount`
- `calculateOrderTotals(products, items, coupon?, shippingCost, giftCardReserved)` — retorna breakdown completo:
  ```
  { subtotal, discount_amount, shipping_amount, gift_card_reserved, total_payable, currency, items_normalized }
  ```

#### 2. Migration SQL — `store_gift_card_reservations` + novos campos em `store_orders`

**Nova tabela `store_gift_card_reservations`:**
| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID FK workspaces |
| gift_card_id | UUID FK store_gift_cards |
| store_order_id | UUID FK store_orders (nullable) |
| stripe_session_id | TEXT |
| amount_reserved | NUMERIC |
| status | TEXT (`reserved`, `consumed`, `released`) |
| expires_at | TIMESTAMPTZ (default now + 2h) |
| consumed_at | TIMESTAMPTZ |
| released_at | TIMESTAMPTZ |
| created_at / updated_at | TIMESTAMPTZ |

RLS: bypass via service_role (edge functions). SELECT para workspace members.

**Novos campos em `store_orders`:**
- `coupon_code TEXT`
- `gift_card_id UUID`
- `gift_card_reserved_amount NUMERIC DEFAULT 0`
- `pricing_breakdown JSONB`
- `source TEXT DEFAULT 'store'`

Índices: `idx_gift_card_reservations_session`, `idx_gift_card_reservations_status`, `idx_store_orders_source`

---

### Ficheiros a alterar (2)

#### 3. `supabase/functions/create-store-checkout/index.ts`

Alterações cirúrgicas:
- Importar `store-pricing.ts`
- Aceitar `couponCode` no payload (além do existente `giftCardCode`)
- Substituir cálculo inline de totais por `calculateOrderTotals()`
- Validar cupão via `validateCoupon()` — rejeitar com mensagem clara se inválido
- **Gift card: criar reserva em vez de débito imediato**
  - Inserir em `store_gift_card_reservations` com `status: 'reserved'`
  - Não alterar `current_balance` do gift card
  - No caso de gift card cobrir 100%: debitar imediatamente (mantém lógica atual) mas registar como `consumed` na reserva
- Gravar `store_orders` com campos novos: `coupon_code`, `gift_card_id`, `gift_card_reserved_amount`, `pricing_breakdown`, `source`
- Incluir no metadata do Stripe session: `store_order_id`, `gift_card_reservation_id`, `coupon_id`

#### 4. `supabase/functions/stripe-webhook/index.ts`

Alterações cirúrgicas (manter 100% da lógica existente de subscrições/propostas):

**Em `checkout.session.completed`**, após o bloco existente de propostas:
```
if (metadata.source === "store") {
  // 1. Idempotência via stripe_event_log
  // 2. Encontrar store_order por stripe_session_id
  // 3. Atualizar: status='paid', paid_at, stripe_payment_intent_id
  // 4. Consumir reserva de gift card (status → consumed, debitar saldo real)
  // 5. Incrementar used_count do cupão + registar store_coupon_usage
  // 6. Inserir store_order_events
  // 7. Registar stripe_event_log
}
```

**Novo case `checkout.session.expired`:**
```
if (metadata.source === "store") {
  // 1. Libertar reserva gift card (status → released, released_at)
  // 2. Atualizar store_order: status='cancelled'
}
```

**Novo case `payment_intent.payment_failed`:**
```
if (metadata.source === "store") {
  // 1. Libertar reserva gift card
  // 2. Atualizar store_order: status='payment_failed'
}
```

Logging estruturado: `[STORE-WEBHOOK]`, `[STORE-GIFTCARD]`

---

### Fluxo final

```text
Frontend                    create-store-checkout              Stripe             stripe-webhook
   │                              │                              │                      │
   ├─ POST {items, coupon, gc} ──►│                              │                      │
   │                              ├─ resolveProducts (DB)        │                      │
   │                              ├─ validateCoupon (DB)         │                      │
   │                              ├─ calculateTotals             │                      │
   │                              ├─ reserveGiftCard (DB)        │                      │
   │                              ├─ INSERT store_order          │                      │
   │                              ├─ create checkout session ───►│                      │
   │◄─ { url } ──────────────────┤                              │                      │
   │                              │                              │                      │
   ├─ redirect to Stripe ────────┼─────────────────────────────►│                      │
   │                              │                              │                      │
   │                              │                              ├── webhook event ────►│
   │                              │                              │                      ├─ idempotency check
   │                              │                              │                      ├─ update order → paid
   │                              │                              │                      ├─ consume GC reservation
   │                              │                              │                      ├─ increment coupon usage
   │                              │                              │                      └─ log events
```

### Compatibilidade frontend

- O frontend continua a enviar o mesmo payload + `couponCode` (já usado para preview)
- Resposta mantém `{ url }` ou `{ success: true, paidWithGiftCard: true }`
- Se cupão inválido: `{ error: "Cupão expirado" }` com status 400
- Success/cancel pages inalteradas

### Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Gift card reservation expira mas webhook chega tarde | `expires_at = now() + 2h` (Stripe sessions expiram em 24h, mas usamos 2h com fallback no webhook) |
| Webhook duplicado | `stripe_event_log` com `UNIQUE(stripe_event_id)` |
| Cupão usado entre validação e pagamento | Incremento de `used_count` apenas no webhook, não no checkout |
| `store_orders.total` diverge do Stripe | Total calculado por `store-pricing.ts`, mesmo valor enviado ao Stripe |

