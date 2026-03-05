

# CRM FastMatch — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Profile CRUD | `useFastMatchProfile.ts` | upsert profile | None | None |
| Discovery | `useFastMatchDiscovery.ts` | read-only query | None | None |
| Interests | `useFastMatchInterests.ts` | send interest + mutual detection | None | Toast only |
| Connections | `useFastMatchConnections.ts` | unlock + CRM auto-create | None | `console.error` on CRM fail |
| Quota | `useFastMatchQuota.ts` | consume quota via RPC | None | None |
| Reviews | `useFastMatchReviews.ts` | submit review + recalc reputation | None | Toast only |
| Smoke Tests | `system-run-smoke-tests` | — | — | No FastMatch checks |

## Implementation Plan

### A) Kernel Events + Logging — `useFastMatchProfile.ts`

Import `emitKernelEvent`. Events: `source_module: 'crm-fastmatch'`, `entity_kind: 'fastmatch_profile'`.

1. `useUpdateFastMatchProfile.onSuccess` → `FASTMATCH.PROFILE_UPDATED` (payload: `fields_changed` keys, `is_new` flag)
2. `onError` → `console.warn('[FASTMATCH] PROFILE_UPDATE_FAILED')`

### B) Kernel Events + Logging — `useFastMatchInterests.ts`

Events: `source_module: 'crm-fastmatch'`, `entity_kind: 'fastmatch_interest'`.

1. `useSendInterest.onSuccess` (non-mutual) → `FASTMATCH.SUGGESTED` (payload: `from_profile_id`, `to_profile_id`, `mutual: false`)
2. `useSendInterest.onSuccess` (mutual) → `FASTMATCH.SUGGESTED` + log `console.log('[FASTMATCH] Mutual interest detected')`
3. `onError` → `console.warn('[FASTMATCH] INTEREST_FAILED')`

### C) Kernel Events + Logging — `useFastMatchConnections.ts`

Events: `source_module: 'crm-fastmatch'`, `entity_kind: 'fastmatch_connection'`.

1. `useUnlockConnection` inside `mutationFn` after connection insert → `FASTMATCH.ACCEPTED` (payload: `profile_a_id`, `profile_b_id`, `source`)
2. CRM auto-create success → `console.log('[FASTMATCH] CRM provisioned: company=${id}, contact=${id}, opportunity=${id}')`
3. CRM auto-create failure → prefix existing `console.error` with `[FASTMATCH]`
4. `onSuccess` → `console.log('[FASTMATCH] Connection unlocked')`
5. `onError` → `console.warn('[FASTMATCH] UNLOCK_FAILED')`

### D) Logging — `useFastMatchQuota.ts`

1. `useConsumeMatchQuota.onSuccess` → `console.log('[FASTMATCH] Quota consumed for profile ${profileId}')`
2. `useConsumeMatchQuota.onError` → `console.warn('[FASTMATCH] QUOTA_CONSUME_FAILED')`

### E) Kernel Events + Logging — `useFastMatchReviews.ts`

Events: `source_module: 'crm-fastmatch'`, `entity_kind: 'fastmatch_review'`.

1. `useSubmitReview.onSuccess` → `FASTMATCH.REVIEW_SUBMITTED` (payload: `connection_id`, `rating`, `reviewed_profile_id`)
2. Log reputation recalc → `console.log('[FASTMATCH] Reputation recalculated for ${reviewedProfileId}: score=${avg}')`
3. `onError` → `console.warn('[FASTMATCH] REVIEW_FAILED')`

### F) Smoke Tests

Add to `system-run-smoke-tests`:
- `fastmatch_profiles` table check (module: `crm-fastmatch`)
- `fastmatch_connections` table check (module: `crm-fastmatch`)
- `fastmatch_interests` table check (module: `crm-fastmatch`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useFastMatchProfile.ts` | Import `emitKernelEvent`; emit `PROFILE_UPDATED`; add `[FASTMATCH]` logging |
| `src/hooks/useFastMatchInterests.ts` | Emit `FASTMATCH.SUGGESTED`; add `[FASTMATCH]` logging |
| `src/hooks/useFastMatchConnections.ts` | Emit `FASTMATCH.ACCEPTED`; add `[FASTMATCH]` logging for CRM provisioning |
| `src/hooks/useFastMatchQuota.ts` | Add `[FASTMATCH]` logging for quota consumption |
| `src/hooks/useFastMatchReviews.ts` | Emit `FASTMATCH.REVIEW_SUBMITTED`; log reputation recalc |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `fastmatch_profiles`, `fastmatch_connections`, `fastmatch_interests` checks |

