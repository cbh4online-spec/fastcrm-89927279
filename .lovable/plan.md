

# Strategy-Brief — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Weekly Brief Generation | `useStrategicBriefs.ts` | None | None |
| Daily Brief Generation | `useDailyBrief.ts` | None | None |
| Edge: strategic-intelligence-brief | `strategic-intelligence-brief/index.ts` | None | Bare `console.error` |
| Edge: daily-revenue-brief | `daily-revenue-brief/index.ts` | None | Bare `console.error` |
| Edge: compute-strategic-decisions | `compute-strategic-decisions/index.ts` | None | Bare `console.error` |
| Strategic Decisions CRUD | `useStrategicDecisions.ts` | `DECISION.CREATED/DISMISSED/CONVERTED/BULK_CONVERTED` ✓ | `[STRATEGY]` prefix ✓ |
| Smoke Tests | `system-run-smoke-tests` | — | Has `strategic_decisions` ✓, missing `weekly_briefs` + `daily_briefs` |

The hooks for strategic decisions already have full kernel event coverage and logging. The three edge functions and both brief hooks have zero events and bare logging. No smoke test coverage for brief tables.

## Implementation Plan

### A) Kernel Events (source: `strategy-brief`)

**`strategic-intelligence-brief/index.ts`:**
1. On successful brief insert → `STRATEGIC_BRIEF.GENERATED` (entity_kind: `weekly_brief`, payload: `leads_total`, `won_deals`, `revenue_this_week`)

**`daily-revenue-brief/index.ts`:**
2. On successful brief insert → `STRATEGIC_BRIEF.GENERATED` (entity_kind: `daily_brief`, payload: `leads_today`, `deals_won`, `revenue_today`, `deals_stalled`)

**`compute-strategic-decisions/index.ts`:**
3. On successful decisions insert → `STRATEGIC_DECISION.CREATED` (entity_kind: `strategic_decision`, payload: `count`, `rule_keys`)

**`useStrategicBriefs.ts`:**
4. `generateBrief` on success → `STRATEGIC_BRIEF.GENERATED` (entity_kind: `weekly_brief`, source_module: `strategy-brief`)

**`useDailyBrief.ts`:**
5. `generateDailyBrief` on success → `STRATEGIC_BRIEF.GENERATED` (entity_kind: `daily_brief`, source_module: `strategy-brief`)

### B) Logging (prefix: `[STRATEGY-BRIEF]`)

**`strategic-intelligence-brief/index.ts`:** Replace bare `console.error` with `[STRATEGY-BRIEF]` prefix; add success log with metrics summary

**`daily-revenue-brief/index.ts`:** Replace bare `console.error` with `[STRATEGY-BRIEF]`; add success log with daily metrics summary

**`compute-strategic-decisions/index.ts`:** Replace bare `console.error` with `[STRATEGY-BRIEF]`; add success log with decisions count and rule keys

**`useStrategicBriefs.ts`:** Add `[STRATEGY-BRIEF]` logging on generate success/error

**`useDailyBrief.ts`:** Add `[STRATEGY-BRIEF]` logging on generate success/error

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `weekly_briefs` (module: `strategy-brief`)
- `daily_briefs` (module: `strategy-brief`)

## File Plan

| File | Action |
|------|--------|
| `supabase/functions/strategic-intelligence-brief/index.ts` | Emit `STRATEGIC_BRIEF.GENERATED` via `kernel_events` insert; add `[STRATEGY-BRIEF]` prefix; log metrics summary on success |
| `supabase/functions/daily-revenue-brief/index.ts` | Emit `STRATEGIC_BRIEF.GENERATED` via `kernel_events` insert; add `[STRATEGY-BRIEF]` prefix; log daily metrics on success |
| `supabase/functions/compute-strategic-decisions/index.ts` | Emit `STRATEGIC_DECISION.CREATED` via `kernel_events` insert; add `[STRATEGY-BRIEF]` prefix; log decisions count |
| `src/hooks/useStrategicBriefs.ts` | Import `emitKernelEvent`; emit `STRATEGIC_BRIEF.GENERATED` on success; add `[STRATEGY-BRIEF]` logging |
| `src/hooks/useDailyBrief.ts` | Import `emitKernelEvent`; emit `STRATEGIC_BRIEF.GENERATED` on success; add `[STRATEGY-BRIEF]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `weekly_briefs` + `daily_briefs` checks under `strategy-brief` module |

