

# B2B-Support — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Ticket CRUD (client portal) | `useClientTickets.ts` | None | `console.error` only |
| Ticket Messages | `useClientTickets.ts` → `useTicketMessages` | None | `console.error` only |
| Ticket List Query | `useClientTickets.ts` | None | `console.error` only |
| Admin Ticket Management | — | N/A | N/A (no admin hook exists) |
| Smoke Tests | `system-run-smoke-tests` | — | No b2b-support checks |

Only one hook file exists: `src/hooks/client-portal/useClientTickets.ts`. It handles ticket creation, listing, and messaging from the client portal. No admin-side ticket hooks, no SLA engine, no assignment logic exists in code yet.

## Implementation Plan

### A) Kernel Events (source: `b2b-support`)

**`useClientTickets.ts`:**
1. `createTicket.onSuccess` → emit `TICKET.CREATED` (entity_kind: `client_ticket`, payload: `subject`, `type`, `priority`, `company_id`)
2. `sendMessage.onSuccess` → emit `TICKET.MESSAGE_SENT` (entity_kind: `client_ticket_message`, payload: `ticket_id`, `sender_type`)

### B) Logging (prefix: `[B2B-SUPPORT]`)

**`useClientTickets.ts`:**
- Ticket list query error → `console.warn('[B2B-SUPPORT] TICKETS_QUERY_FAILED')`
- Create ticket success → `console.log('[B2B-SUPPORT] TICKET_CREATED id=...')`
- Create ticket error → `console.error('[B2B-SUPPORT] TICKET_CREATE_FAILED')`
- Messages query error → `console.warn('[B2B-SUPPORT] MESSAGES_QUERY_FAILED')`
- Send message success → `console.log('[B2B-SUPPORT] MESSAGE_SENT ticket=...')`
- Send message error → `console.error('[B2B-SUPPORT] MESSAGE_SEND_FAILED')`

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `client_tickets` (module: `b2b-support`)
- `client_ticket_messages` (module: `b2b-support`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/client-portal/useClientTickets.ts` | Import `emitKernelEvent`; emit `TICKET.CREATED` + `TICKET.MESSAGE_SENT`; add `[B2B-SUPPORT]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 2 b2b-support table checks |

## Notes

- No admin-side ticket management hooks exist — only client portal CRUD. Events and logging are scoped to what exists today.
- SLA timers, assignment, and AI replies are future work (no code paths exist yet to instrument).

