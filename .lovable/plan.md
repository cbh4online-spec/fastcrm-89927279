

# CRM Opportunities — Kernel V2 Stabilization

## Current State

| Area | Status | Detail |
|------|--------|--------|
| Kernel Events | Partial | `OPPORTUNITY.CREATED`, `UPDATED`, `STAGE_CHANGED`, `CLOSED` wired. Missing: `ACTIVITY_ADDED`, `DEAL.SCORE_UPDATED`, `OPPORTUNITY.STALE` |
| Activity Tracking | Partial | `useCreateActivity` exists in `useCrmActivities.ts` but no kernel event emitted on activity creation. Not called from opportunity mutations. |
| Stale Detection | Exists server-side | `kernel-compute-decisions` already detects stale opps (>5 days). Missing: dedicated kernel event emission + client-side awareness |
| Deal Score | Works | `compute-deal-score` is idempotent (upsert on `opportunity_id`). Missing: `DEAL.SCORE_UPDATED` kernel event after computation, no observability logging |
| Smoke Tests | Basic | Only count queries for `opportunities`. No flow test (create→move→score) |

## Implementation Plan

### A) Kernel Events — Wire Missing Events

**1. `OPPORTUNITY.ACTIVITY_ADDED`** — In `useCreateActivity` (`useCrmActivities.ts`), when `entity_type === 'opportunity'`, emit kernel event with `activity_type`, `opportunity_id`, `title` in payload.

**2. `DEAL.SCORE_UPDATED`** — In `compute-deal-score` edge function, after successful upsert, emit a kernel event via direct insert into `kernel_events` table with `close_score`, `category`, `urgency`, `previous_score` (fetch before upsert).

**3. `OPPORTUNITY.STALE`** — In `compute-deal-score`, when `recency_score < 0.2` (>14 days inactive), emit `OPPORTUNITY.STALE` kernel event alongside the score update. This piggybacks on existing score computation without needing a separate job.

### B) Observability — compute-deal-score

Add timing + input logging to the edge function:
- Log `[DEAL-SCORE] opportunity_id=X latency_ms=Y score=Z category=W` after computation
- Log scoring inputs: `engagement_score`, `recency_score`, `trust_score` etc. for debugging
- Log stage change transitions when `previous_category !== new_category`

### C) Activity Tracking — Kernel Integration

In `useCreateActivity.onSuccess`, emit `OPPORTUNITY.ACTIVITY_ADDED` kernel event when the activity is linked to an opportunity (via `opportunity_id` field). Include `activity_type` and `entity_type` in payload.

### D) Smoke Test Enhancement

Add a `crm-deal-score` check to `system-run-smoke-tests`: query `deal_scores` table count for workspace. Also add `crm-activities` check on `crm_activities` table.

### E) V2 — Score Change Detection

In `compute-deal-score`, fetch the existing score before upsert. If `category` changed, include `label_changed: true` and `previous_label` in the `DEAL.SCORE_UPDATED` event payload. This feeds the existing `kernel-compute-decisions` "deal score drop" rule.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useCrmActivities.ts` | Emit `OPPORTUNITY.ACTIVITY_ADDED` kernel event in `useCreateActivity.onSuccess` when `opportunity_id` present |
| `supabase/functions/compute-deal-score/index.ts` | Add timing logs, fetch previous score before upsert, emit `DEAL.SCORE_UPDATED` + conditional `OPPORTUNITY.STALE` kernel events via `kernel_events` insert |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `crm-deal-score` and `crm-activities` checks |

