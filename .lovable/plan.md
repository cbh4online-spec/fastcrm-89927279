

# Comm Inbox — Kernel V2 Stabilization & Integration

## Current State

The inbox already has:
- Realtime subscriptions for conversations (postgres_changes) and messages (INSERT)
- Kernel events: `CONVERSATION.RECEIVED`, `CONVERSATION.UPDATED` (realtime), `MESSAGE.SENT` (useSendMessage onSuccess)
- AI panels: summary, classification, intelligence
- Actions: priority, status, assign, follow-up, create opportunity, resolve
- Smoke tests: `conversations_query`, `messages_query` (basic count checks)

## What's Missing

| Gap | Detail |
|-----|--------|
| `CONVERSATION.ASSIGNED` event | `useAssignConversation` has no kernel event |
| `CONVERSATION.STATUS_CHANGED` event | `useUpdateConversationStatus` has no kernel event |
| `MESSAGE.RECEIVED` event | Realtime only emits CONVERSATION.RECEIVED/UPDATED, not per-message |
| `CONVERSATION.SLA_BREACHED` | No SLA tracking exists at all |
| Quick Actions via Kernel | Actions panel doesn't route through `kernel-action-engine` |
| Stale conversation detector | No automated detection of stale/abandoned conversations |
| Correlation IDs on mutations | `useAssignConversation`, `useUpdateConversationStatus`, `useMarkConversationRead` have none |
| Realtime reconnect logging | No observability on subscription failures |

## Implementation Plan

### A) Blockers — Kernel Event Wiring

**1. `useAssignConversation`** — emit `CONVERSATION.ASSIGNED` on success with `assigned_to`, `previous_assigned_to` in payload.

**2. `useUpdateConversationStatus`** — emit `CONVERSATION.STATUS_CHANGED` on success with `status`, `previous_status` in payload.

**3. `MESSAGE.RECEIVED` via realtime** — In `ConversationList.tsx` realtime handler (line 110-129), emit `MESSAGE.RECEIVED` kernel event when an inbound message INSERT is detected.

**4. `useMarkConversationResolved`** (`useInboxActions.ts`) — emit `CONVERSATION.STATUS_CHANGED` with status=closed.

### B) V2 Improvements

**1. Stale Conversation Detector** — New hook `useStaleConversationDetector.ts`:
- Query open conversations where `last_message_at` < 48h ago AND `last_message_direction` = 'inbound' (client waiting)
- Emit `CONVERSATION.STALE` kernel event for each
- Run on inbox mount, debounced

**2. Quick Actions via Kernel** — Add "Create Task" and "Run AI Agent" buttons to `InboxContextPanel` actions tab:
- "Create Task" invokes `kernel-run-actions` with action_key `CREATE_TASK`
- "Run AI Agent" invokes `kernel-run-actions` with action_key `RUN_AI_AGENT_JOB`
- Both pass `correlation_id` and `conversation_id`

**3. Conversation timeline enrichment** — Add classification badges (priority, intent, sentiment) to `ConversationList` items using existing `ai_priority`, `ai_intent`, `ai_sentiment` fields already on the conversation object.

### C) SLA Tracking (Lightweight V1)

No new tables needed. Compute SLA status client-side:
- If open conversation has `last_message_direction=inbound` and `last_message_at` > X hours ago → SLA risk
- Display SLA badge in ConversationList
- Emit `CONVERSATION.SLA_BREACHED` kernel event from the stale detector when threshold exceeded

### D) Smoke Test Enhancement

Add to `system-run-smoke-tests`:
- `inbox-action-logs`: query `inbox_action_logs` count

### E) Observability

- All new kernel emitters include `correlation_id` via `generateRequestId()`
- Add `console.log` for realtime subscription status changes (connected/disconnected/error)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useConversations.ts` | Add kernel events to `useAssignConversation` + `useUpdateConversationStatus` onSuccess |
| `src/hooks/useInboxActions.ts` | Add kernel event to `useMarkConversationResolved` onSuccess |
| `src/components/inbox/ConversationList.tsx` | Emit MESSAGE.RECEIVED kernel event on inbound INSERT, add classification badges, add realtime logging |
| `src/hooks/useStaleConversationDetector.ts` | New — detect stale conversations + emit kernel events |
| `src/components/inbox/InboxContextPanel.tsx` | Add "Create Task" and "Run AI Agent" quick action buttons |
| `src/components/inbox/InboxView.tsx` | Wire stale detector hook |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add inbox-action-logs check |

