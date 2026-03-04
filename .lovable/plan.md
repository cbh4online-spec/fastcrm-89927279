

# FastCRM Event System (Kernel v1) — Implementation Plan

## Current State

Most Kernel infrastructure already exists:
- **Tables**: `kernel_events`, `kernel_entities`, `kernel_links`, `kernel_actions_registry`, `kernel_action_runs`, `kernel_decisions`, `kernel_decision_evidence`, `context_bindings`, `change_events`, `impact_map`, `drift_scores`
- **Edge functions**: `kernel-ingest-event`, `kernel-process-events`, `kernel-compute-decisions`, `kernel-run-actions`, `kernel-compute-impact`, `kernel-compute-drift`
- **Hooks**: `useKernelDecisions`, `useKernelActions`, `useKernelEntities`, `useDriftScores`, etc.
- **UI**: `KernelDecisionsPanel`, `KernelActionsLog`, `DriftOverview` in Command Center
- **Emitter**: `kernelEmitter.ts` exists but is **never called** from any module

## What's Missing

| Gap | Details |
|---|---|
| `kernel_event_state` table | Consumer watermarks for batch processing |
| `kernel_event_deadletter` table | Failed event storage for retry/debug |
| Event emitters wired | `emitKernelEvent` never called — needs wiring into opportunity stage changes, conversation classification, context block updates |
| `CONTEXT_DRIFT_HIGH` decision | Not in `kernel-compute-decisions` rules |
| `NOTIFY_OWNER` action | Not in `kernel-run-actions` switch |
| `useKernelEvents` hook | No hook to query/display recent kernel events |
| Events timeline in Command Center | No recent events timeline UI |
| Watermark-based processing | `kernel-process-events` uses timestamp param, not persistent watermark |

## Implementation

### 1. Database Migration
- Create `kernel_event_state` (consumer_id, last_event_id, last_processed_at, workspace_id)
- Create `kernel_event_deadletter` (id, workspace_id, original_event jsonb, error text, retries int, created_at)
- Seed `NOTIFY_OWNER` into `kernel_actions_registry`
- RLS on both new tables scoped to workspace

### 2. Edge Function Updates

**`kernel-process-events`**: Read/write watermark from `kernel_event_state` instead of relying on `since` param. On failure, insert into `kernel_event_deadletter`.

**`kernel-compute-decisions`**: Add Rule 4 — `CONTEXT_DRIFT_HIGH`: query `drift_scores` where score > 60, create decision with recommended actions (NOTIFY_OWNER + CREATE_TASK).

**`kernel-run-actions`**: Add `NOTIFY_OWNER` case — looks up opportunity owner from entity, inserts alert targeted to that user.

### 3. Event Emitters (Wiring)

Add `emitKernelEvent` calls in `onSuccess` of:

- **`useMoveOpportunityEnhanced`** → `OPPORTUNITY.STAGE_CHANGED` (entity_kind: opportunity, payload: { stage_id, title })
- **`useUpdateOpportunityEnhanced`** → `OPPORTUNITY.UPDATED`
- **`useCloseOpportunity`** → `OPPORTUNITY.CLOSED` (payload: { status: won/lost })

These are fire-and-forget calls in existing `onSuccess` callbacks — no behavioral change to existing mutations.

### 4. Frontend

**New hook `useKernelEvents`**: Query `kernel_events` for workspace, ordered by created_at desc, limit 20.

**New component `KernelEventsTimeline`**: Compact timeline showing recent kernel events with type icon, entity reference, and relative timestamp.

**Command Center update**: Add "Events" section below drift/actions overview showing the timeline.

### File Plan

| File | Action |
|---|---|
| Migration SQL | 2 new tables + seed NOTIFY_OWNER |
| `supabase/functions/kernel-process-events/index.ts` | Add watermark + deadletter logic |
| `supabase/functions/kernel-compute-decisions/index.ts` | Add CONTEXT_DRIFT_HIGH rule |
| `supabase/functions/kernel-run-actions/index.ts` | Add NOTIFY_OWNER case |
| `src/hooks/useOpportunitiesEnhanced.ts` | Wire emitKernelEvent in 3 mutations |
| `src/hooks/useKernelEvents.ts` | New — query kernel_events |
| `src/components/kernel/KernelEventsTimeline.tsx` | New — timeline component |
| `src/pages/CommandCenterPage.tsx` | Add events timeline section |

