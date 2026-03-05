

# Strategy Context OS — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Context Blocks | Partial events | `CONTEXT.BLOCK_UPDATED`, `STATUS_CHANGED`, `RICH_TEXT_UPDATED` exist. Missing `CONTEXT.BLOCK_CREATED` (seed). No structured logging |
| Drift | Works | `useContextDrift` calls `compute-drift` edge function. Zero kernel events, no logging |
| Bindings | Works | `useContextBindings` CRUD. Zero kernel events, no logging |
| Versions | Works | `useContextVersions` read-only + `useCreateVersion`. No kernel events |
| Impact Map | Works | `useImpactMapData` calls `compute-impact`. No kernel events on results |
| Smoke Tests | Partial | `context_blocks` and `context_fields` checked. Missing `context_drift`, `context_bindings`, `context_dependencies` |

## Implementation Plan

### A) Kernel Events — Missing Emitters

**1. `useContextBlocks.ts`** — Add structured logging to all existing events (`[CONTEXT]` prefix). Add `console.warn` on errors.

**2. `useContextDrift.ts`** — On `recompute.onSuccess`, emit `CONTEXT.DRIFT_RECOMPUTED` with `workspace_id`. Add `[CONTEXT]` logging.

**3. `useContextBindings.ts`** — On `addBinding.onSuccess`, emit `CONTEXT.BINDING_CREATED` with `block_id`, `asset_kind`, `asset_id`. On `removeBinding.onSuccess`, emit `CONTEXT.BINDING_REMOVED`. Add logging.

**4. `useImpactMapData.ts`** — On `simulateImpact.onSuccess`, emit `IMPACT.MAP_UPDATED` with `source_block_id`, `impacted_count`. Add logging.

All events use `source_module: 'strategy-context-os'`.

### B) Observability — Structured Logging

All hooks: `[CONTEXT]` prefixed `console.log` on success, `console.warn` on error for every mutation.

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `context_drift` table check
- `context_bindings` table check
- `context_dependencies` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useContextBlocks.ts` | Add `[CONTEXT]` structured logging to all mutations |
| `src/hooks/useContextDrift.ts` | Import `emitKernelEvent`; emit `CONTEXT.DRIFT_RECOMPUTED` on recompute; add logging |
| `src/hooks/useContextBindings.ts` | Import `emitKernelEvent`; emit `CONTEXT.BINDING_CREATED`/`REMOVED`; add logging |
| `src/hooks/useImpactMapData.ts` | Import `emitKernelEvent`; emit `IMPACT.MAP_UPDATED` on simulate; add logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `context_drift`, `context_bindings`, `context_dependencies` checks |

