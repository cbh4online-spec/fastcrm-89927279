

# Store-Ecommerce — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Checkout | `create-store-checkout` edge fn | None | Has `[STORE-CHECKOUT]` prefix (good) |
| Webhook (payment confirm) | `store-webhook` edge fn | None | Has `[STORE-WEBHOOK]` prefix (good) |
| Cart Context | `StoreCartContext.tsx` | None | Bare `console.error` |
| Cart Abandonment Detect | `detect-abandoned-carts` edge fn | None | Has `[DETECT-ABANDONED]` prefix |
| Cart Abandonment Process | `store-cart-abandonment` edge fn | None | Has `[CART-ABANDONMENT]` prefix |
| Store Automation | `useStoreAutomation.ts` | None | Toast only |
| Visitor Tracking | `useStoreVisitorTracking.ts` | None | Bare `console.error` |
| Order Status Update | `useStoreOrders.ts` | `ORDER.FULFILLED` (done) | `[ORDERS]` prefix (done) |
| Returns/Refunds | `useReturnRequests.ts` + `process-refund` edge fn | None | Has `[PROCESS-REFUND]` prefix |
| Smoke Tests | `system-run-smoke-tests` | — | No store-ecommerce checks |

Partially logged edge functions. Zero kernel events for checkout/payment/cart lifecycle.

## Implementation Plan

### A) Kernel Events — Webhook (`store-webhook/index.ts`)

After order marked as paid (line ~251):
1. Emit `CHECKOUT.COMPLETED` (entity_kind: `store_order`, payload: `order_id`, `total`, `items_count`, `is_first_purchase`)
2. Emit `PAYMENT.CONFIRMED` (entity_kind: `store_order`, payload: `order_id`, `payment_intent_id`, `total`)

Source: `store-ecommerce` for all events in this module.

### B) Kernel Events — Cart Abandonment (`detect-abandoned-carts/index.ts`)

After abandoned cart record created (line ~74):
3. Emit `CART.ABANDONED` (entity_kind: `store_abandoned_cart`, payload: `session_id`, `subtotal`, `items_count`)

### C) Kernel Events — Refund (`process-refund/index.ts`)

After Stripe refund created (line ~104):
4. Emit `PAYMENT.REFUNDED` (entity_kind: `store_order`, payload: `order_id`, `refund_id`, `amount`, `return_request_id`)

### D) Logging — UI Hooks

**`useStoreAutomation.ts`:**
1. `useTrackCartAbandonment` error → `console.warn('[ECOMMERCE] CART_TRACK_FAILED')`
2. `useSendCartRecovery.onSuccess` → `console.log('[ECOMMERCE] Cart recovery initiated')`
3. `useSendCartRecovery.onError` → `console.warn('[ECOMMERCE] CART_RECOVERY_FAILED')`

**`useReturnRequests.ts`:**
4. `useCreateReturnRequest.onSuccess` → `console.log('[ECOMMERCE] Return request created')`
5. `useCreateReturnRequest.onError` → `console.warn('[ECOMMERCE] RETURN_CREATE_FAILED')`
6. `useProcessReturn.onSuccess` → `console.log('[ECOMMERCE] Return processed: ${data.status}')`
7. `useProcessReturn.onError` → `console.warn('[ECOMMERCE] RETURN_PROCESS_FAILED')`

**`StoreCartContext.tsx`:**
8. Cart sync error → `console.warn('[ECOMMERCE] CART_SYNC_FAILED')`

**`useStoreVisitorTracking.ts`:**
9. Upsert error → `console.warn('[ECOMMERCE] VISITOR_SESSION_FAILED')`
10. Classification error → `console.warn('[ECOMMERCE] VISITOR_CLASSIFY_FAILED')`

### E) Logging — Edge Functions (prefix alignment)

**`detect-abandoned-carts/index.ts`:** Change prefix from `[DETECT-ABANDONED]` to `[ECOMMERCE]` for consistency.

**`store-cart-abandonment/index.ts`:** Change prefix from `[CART-ABANDONMENT]` to `[ECOMMERCE]`.

**`store-webhook/index.ts`:** Keep `[STORE-WEBHOOK]` (already good), add kernel event emit calls.

**`process-refund/index.ts`:** Keep `[PROCESS-REFUND]` (already good), add kernel event emit.

### F) Smoke Tests

Add to `system-run-smoke-tests`:
- `store_abandoned_carts` (module: `store-ecommerce`)
- `store_automation_events` (module: `store-ecommerce`)
- `store_visitor_sessions` (module: `store-ecommerce`)
- `return_requests` (module: `store-ecommerce`)

## File Plan

| File | Action |
|------|--------|
| `supabase/functions/store-webhook/index.ts` | Emit `CHECKOUT.COMPLETED` + `PAYMENT.CONFIRMED` via kernel-ingest-event fetch |
| `supabase/functions/detect-abandoned-carts/index.ts` | Emit `CART.ABANDONED`; align prefix to `[ECOMMERCE]` |
| `supabase/functions/store-cart-abandonment/index.ts` | Align prefix to `[ECOMMERCE]` |
| `supabase/functions/process-refund/index.ts` | Emit `PAYMENT.REFUNDED` via kernel-ingest-event fetch |
| `src/hooks/useStoreAutomation.ts` | Add `[ECOMMERCE]` logging |
| `src/hooks/useReturnRequests.ts` | Add `[ECOMMERCE]` logging |
| `src/contexts/StoreCartContext.tsx` | Align cart sync error to `[ECOMMERCE]` |
| `src/hooks/useStoreVisitorTracking.ts` | Align errors to `[ECOMMERCE]` |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 4 store-ecommerce table checks |

Note: Edge functions emit kernel events by calling `kernel-ingest-event` via internal fetch (same pattern as other edge-to-kernel integrations), since they cannot import the client-side `emitKernelEvent` helper.

