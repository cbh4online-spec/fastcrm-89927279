

# Sales-Orders — Kernel V2 Stabilization

## Current State

The "sales-orders" module has **three order subsystems** with zero kernel events and minimal logging:

| Subsystem | Hooks / Edge Functions | Kernel Events | Logging |
|-----------|----------------------|---------------|---------|
| **Store Orders** | `useStoreOrders` (status update), `useStoreOrderEvents` (timeline), `useStoreOrderDetail` | None | Toast only; notification email catch has no prefix |
| **Order Notes (B2B)** | `useOrderNotes` (list/detail/actions), `useCreateOrderNote`, `useClientOrders`, `useCompanyOrderNotes` | None | Toast only |
| **Order Note Submit** | `order-note-submit` edge fn | None | Bare `console.error` |
| **B2B Plan → Order** | `b2b-plan-generate-order` edge fn | None | None |
| **Status Notification** | `send-order-status-notification` edge fn | N/A | Already has `[ORDER-STATUS-EMAIL]` prefix |
| **Smoke Tests** | `system-run-smoke-tests` | — | No order table checks |

## Implementation Plan

### A) Kernel Events + Logging — Store Orders (`useStoreOrders.ts`)

Import `emitKernelEvent`. Events: `source_module: 'sales-orders'`, `entity_kind: 'store_order'`.

1. `useUpdateStoreOrderStatus.onSuccess` → if status is `delivered` or `completed`, emit `ORDER.FULFILLED` (payload: `order_id`, `status`, `old_status`)
2. `onSuccess` → `console.log('[ORDERS] Store order status updated: ${id} → ${status}')`
3. `onError` → `console.warn('[ORDERS] STORE_ORDER_STATUS_FAILED', error.message)`
4. Notification email catch → prefix with `[ORDERS]`

### B) Kernel Events + Logging — Order Notes (`useOrderNotes.ts`, `useCreateOrderNote.ts`)

Events: `source_module: 'sales-orders'`, `entity_kind: 'order_note'`.

**`useCreateOrderNote.ts`:**
1. `onSuccess` → emit `ORDER.CREATED` (payload: `order_number`, `total_gross`, `items_count`, `currency`)
2. `onError` → `console.warn('[ORDERS] ORDER_NOTE_CREATE_FAILED')`

**`useOrderNotes.ts` — `useOrderNoteActions`:**
3. `updateOrderMutation.onSuccess` → `console.log('[ORDERS] Order note updated: ${orderId}')`
4. `updateOrderMutation.onError` → `console.warn('[ORDERS] ORDER_NOTE_UPDATE_FAILED')`
5. `addAdminNote` catch → `console.warn('[ORDERS] ADMIN_NOTE_FAILED')`

### C) Logging — Client Portal Orders (`useClientOrders.ts`)

1. `createOrderMutation.onError` → `console.warn('[ORDERS] CLIENT_ORDER_CREATE_FAILED')`
2. `addItemMutation.onError` → `console.warn('[ORDERS] CLIENT_ORDER_ADD_ITEM_FAILED')`
3. `submitOrderMutation.onError` → `console.warn('[ORDERS] CLIENT_ORDER_SUBMIT_FAILED')`
4. `submitOrderMutation.onSuccess` → `console.log('[ORDERS] Client order submitted')`

### D) Logging — Store Order Events (`useStoreOrderEvents.ts`)

1. `useAddStoreOrderEvent.onError` → `console.warn('[ORDERS] ORDER_EVENT_ADD_FAILED')`
2. `useAddStoreOrderEvent.onSuccess` → `console.log('[ORDERS] Event added to order: ${orderId}')`

### E) Logging — Edge Functions

**`order-note-submit/index.ts`:**
1. After auth verification → `console.log('[ORDERS] Submit: order=${orderId}, user=${user.id}')`
2. After status update → `console.log('[ORDERS] Submitted: order=${orderId}, status=${newStatus}, total=${totalGross}')`
3. Error → prefix existing `console.error` with `[ORDERS]`

**`b2b-plan-generate-order/index.ts`:**
4. Before insert → `console.log('[ORDERS] B2B plan order: run=${runId}, plan=${plan.name}')`
5. After insert → `console.log('[ORDERS] B2B order created: id=${order.id}, number=${orderNumber}')`
6. Error → `console.error('[ORDERS] B2B_PLAN_ORDER_FAILED', e.message)`

### F) Smoke Tests

Add to `system-run-smoke-tests`:
- `store_orders` table check (module: `sales-orders`)
- `store_order_events` table check (module: `sales-orders`)
- `order_notes` table check (module: `sales-orders`)
- `order_note_items` table check (module: `sales-orders`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useStoreOrders.ts` | Import `emitKernelEvent`; emit `ORDER.FULFILLED`; add `[ORDERS]` logging |
| `src/hooks/useCreateOrderNote.ts` | Import `emitKernelEvent`; emit `ORDER.CREATED`; add `[ORDERS]` logging |
| `src/hooks/useOrderNotes.ts` | Add `[ORDERS]` logging to actions |
| `src/hooks/client-portal/useClientOrders.ts` | Add `[ORDERS]` logging |
| `src/hooks/useStoreOrderEvents.ts` | Add `[ORDERS]` logging |
| `supabase/functions/order-note-submit/index.ts` | Add `[ORDERS]` prefixed logging |
| `supabase/functions/b2b-plan-generate-order/index.ts` | Add `[ORDERS]` prefixed logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `store_orders`, `store_order_events`, `order_notes`, `order_note_items` checks |

