

# Sales-Proposals — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Create | `useProposals.ts` → `useCreateProposal` | insert proposal + version | None | Toast only |
| Update | `useProposals.ts` → `useUpdateProposal` | update + optional version | None | Toast only |
| Publish | `useProposals.ts` → `usePublishProposal` | set status=published | None | Toast only |
| Quick Status | `useProposals.ts` → `useQuickStatusChange` | set status (accepted/rejected) | None | GTM track only |
| Duplicate | `useProposals.ts` → `useDuplicateProposal` | clone proposal + items | None | Toast only |
| Delete | `useProposals.ts` → `useDeleteProposal` | delete | None | Toast only |
| Items | `useProposals.ts` → `useUpdateProposalItems` | replace items + recalc price | None | Toast only |
| Cost Refresh | `useProposals.ts` → `useRefreshCostSnapshots` | sync product costs | None | Toast only |
| Templates | `useProposals.ts` → CRUD template hooks | insert/update/soft-delete | None | Toast only |
| AI Analysis | `useProposalAI.ts` | invoke edge functions | None | `console.error` only |
| Analytics | `useProposalAnalytics.ts` | read-only | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | No proposal checks | — |

Zero kernel events. Zero structured logging.

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useProposals.ts`

Import `emitKernelEvent`. All events: `source_module: 'sales-proposals'`, `entity_kind: 'proposal'`.

**Create:**
1. `useCreateProposal.onSuccess` → `PROPOSAL.CREATED` (payload: `has_template`, `has_price`, `currency`, `items_count: 0`)
2. `onError` → `console.warn('[PROPOSALS] CREATE_FAILED')`

**Publish (= SENT):**
3. `usePublishProposal.onSuccess` → `PROPOSAL.SENT` (payload: `proposal_id`, `slug`)
4. `onError` → `console.warn('[PROPOSALS] PUBLISH_FAILED')`

**Quick Status Change:**
5. `useQuickStatusChange.onSuccess` when `accepted` → `PROPOSAL.SIGNED` (payload: `proposal_id`, `price`, `currency`)
6. `useQuickStatusChange.onSuccess` when `rejected` → `PROPOSAL.REJECTED` (payload: `proposal_id`)
7. `onError` → `console.warn('[PROPOSALS] STATUS_CHANGE_FAILED')`

**Update:**
8. `useUpdateProposal.onSuccess` → `console.log('[PROPOSALS] Updated: ${id}')`; if status changed to `accepted` → `PROPOSAL.SIGNED`
9. `onError` → `console.warn('[PROPOSALS] UPDATE_FAILED')`

**Delete:**
10. `useDeleteProposal.onSuccess` → `console.log('[PROPOSALS] Deleted: ${id}')`
11. `onError` → `console.warn('[PROPOSALS] DELETE_FAILED')`

**Duplicate:**
12. `useDuplicateProposal.onSuccess` → `console.log('[PROPOSALS] Duplicated: ${sourceId} → ${newId}')`
13. `onError` → `console.warn('[PROPOSALS] DUPLICATE_FAILED')`

**Items:**
14. `useUpdateProposalItems.onSuccess` → `console.log('[PROPOSALS] Items updated: ${count} items, total=${price}')`
15. `onError` → `console.warn('[PROPOSALS] ITEMS_UPDATE_FAILED')`

**Cost Refresh:**
16. `useRefreshCostSnapshots.onSuccess` → `console.log('[PROPOSALS] Cost snapshots refreshed')`
17. `onError` → `console.warn('[PROPOSALS] COST_REFRESH_FAILED')`

**Templates:**
18. `useCreateProposalTemplate.onSuccess` → `console.log('[PROPOSALS] Template created')`
19. All template `onError` → prefix with `[PROPOSALS]`

### B) Logging — `src/hooks/useProposalAI.ts`

Add `[PROPOSALS]` prefix to existing `console.error` calls (no kernel events — AI utility):
1. Analysis errors → `console.warn('[PROPOSALS] AI_ANALYSIS_FAILED')`
2. Scope generation errors → `console.warn('[PROPOSALS] AI_SCOPE_FAILED')`
3. Timeline errors → `console.warn('[PROPOSALS] AI_TIMELINE_FAILED')`

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `proposals` table check (module: `sales-proposals`)
- `proposal_items` table check (module: `sales-proposals`)
- `proposal_templates` table check (module: `sales-proposals`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useProposals.ts` | Import `emitKernelEvent`; emit `PROPOSAL.CREATED`, `PROPOSAL.SENT`, `PROPOSAL.SIGNED`, `PROPOSAL.REJECTED`; add `[PROPOSALS]` logging across all mutations |
| `src/hooks/useProposalAI.ts` | Prefix existing error logs with `[PROPOSALS]` |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `proposals`, `proposal_items`, `proposal_templates` checks |

