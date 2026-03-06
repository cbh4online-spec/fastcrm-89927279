

# B2B-Orders — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Order Create (admin) | `useCreateOrderNote.ts` | `ORDER.CREATED` (done) | `[ORDERS]` (done) |
| Order Update (admin) | `useOrderNotes.ts` | None | `[ORDERS]` (done) |
| Status Change | `useOrderNoteStatus.ts` | None | None |
| Approvals (admin) | `useOrderApprovals.ts` | None | Toast only |
| Approval Stats | `useOrderApprovals.ts` | None | None |
| Client Orders (portal) | `useClientOrders.ts` | None | `[ORDERS]` partial |
| Contact Order Notes | `useContactOrderNotes.ts` | None | None |
| Notify Edge Fn | `order-note-notify` | None | Has logging |
| Smoke Tests | `system-run-smoke-tests` | — | Has `order_notes` + `order_note_items` |

`ORDER.CREATED` is already emitted. Missing: approval/reject events, status change events, client-portal submit event, and standardized logging on approvals and status hooks.

## Implementation Plan

### A) Kernel Events (source: `b2b-orders`)

**`useOrderApprovals.ts`:**
1. `approveMutation.onSuccess` → emit `B2B.ORDER_APPROVED` (entity_kind: `order_note`, payload: `order_id`)
2. `rejectMutation.onSuccess` → emit `B2B.ORDER_REJECTED` (entity_kind: `order_note`, payload: `order_id`, `reason`)
3. `bulkApproveMutation.onSuccess` → emit `B2B.ORDER_APPROVED` per order ID

**`useOrderNoteStatus.ts`:**
4. `changeStatusMutation.onSuccess` → emit `B2B.ORDER_STATUS_CHANGED` (payload: `order_id`, `new_status`)

### B) Logging (prefix: `[B2B-ORDERS]`)

**`useOrderApprovals.ts`:**
- Approve success/error, Reject success/error, Bulk approve success/error
- Query error for pending orders

**`useOrderNoteStatus.ts`:**
- Status change success/error, Notification failure (already has `console.error` — align prefix)

**`useContactOrderNotes.ts`:**
- Query error → `console.warn('[B2B-ORDERS] CONTACT_ORDERS_FAILED')`

**`useClientOrders.ts`:**
- Already has `[ORDERS]` — keep as-is (client-portal context)

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `order_audit_logs` (module: `b2b-orders`) — if table exists
- `client_approval_requests` (module: `b2b-orders`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useOrderApprovals.ts` | Import `emitKernelEvent`; emit `B2B.ORDER_APPROVED` + `B2B.ORDER_REJECTED`; add `[B2B-ORDERS]` logging |
| `src/hooks/useOrderNoteStatus.ts` | Import `emitKernelEvent`; emit `B2B.ORDER_STATUS_CHANGED`; align logging to `[B2B-ORDERS]` |
| `src/hooks/useContactOrderNotes.ts` | Add `[B2B-ORDERS]` error logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `client_approval_requests` smoke check (module: `b2b-orders`) |

