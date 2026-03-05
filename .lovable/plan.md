

# Strategy Command Center — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Strategic Decisions | Works | `useStrategicDecisions`: generate/dismiss/convert. Zero kernel events |
| Kernel Decisions | Works | `useKernelDecisions`: accept/reject/archive/execute. Zero kernel events |
| Kernel Actions | Works | `useKernelActions`: registry + runs query. No events on execution |
| Smoke Tests | Partial | `kernel_events` checked but not `strategic_decisions`, `kernel_decisions`, `kernel_action_runs` |
| Observability | **None** | No structured logging anywhere |

## Implementation Plan

### A) Kernel Events — Strategic Decisions

**`useStrategicDecisions.ts`:**
1. `useGenerateStrategicDecisions.onSuccess` — Emit `DECISION.CREATED` with `source: 'strategic_engine'`
2. `useDismissDecision.onSuccess` — Emit `DECISION.DISMISSED` with `decision_id`
3. `useConvertAllDecisionSteps.onSuccess` — Emit `DECISION.CONVERTED` with `decision_id`, `steps_count`
4. `useBulkConvertAllDecisions.onSuccess` — Emit `DECISION.BULK_CONVERTED` with `total_decisions`, `total_tasks`

### B) Kernel Events — Kernel Decisions & Actions

**`useKernelDecisions.ts`:**
1. `acceptDecision.onSuccess` — Emit `DECISION.APPROVED` with `decision_id`
2. `rejectDecision.onSuccess` — Emit `DECISION.REJECTED` with `decision_id`
3. `executeDecision.onSuccess` — Emit `ACTION.EXECUTED` with `decision_id`

All events use `source_module: 'strategy-command-center'`.

### C) Observability — Structured Logging

Both hooks: add `[STRATEGY]` prefixed logging on success/error for all mutations.

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `strategic_decisions` table check
- `kernel_decisions` table check
- `kernel_action_runs` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useStrategicDecisions.ts` | Import `emitKernelEvent`; emit events in generate/dismiss/convert mutations; add logging |
| `src/hooks/useKernelDecisions.ts` | Import `emitKernelEvent`; emit events in accept/reject/execute mutations; add logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `strategic_decisions`, `kernel_decisions`, `kernel_action_runs` checks |

