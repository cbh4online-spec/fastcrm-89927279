

# Mkt-Prospecting — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Search | `professional-prospecting-search` edge fn | None | Bare `console.error` |
| Analyze | `professional-prospecting-analyze` edge fn | None | Bare `console.error` |
| Message Gen | `generate-prospecting-message` edge fn | None | None |
| Batch Messages | `batch-generate-prospecting-messages` edge fn | None | None |
| Outreach Processor | `prospecting-outreach-processor` edge fn | None | Bare `console.error` |
| Enrich Instagram | `enrich-instagram-profile` edge fn | None | Has `[ENRICH-INSTAGRAM]` prefix (good) |
| Single Send | `PendingOutreachPanel.tsx` → `markSent` | None | Bare `console.error` |
| Bulk Send | `BulkOutreachDialog.tsx` → `handleConfirmSent` | None | Bare `console.error` |
| Convert Profile | `ProspectingResults.tsx` → `convertMutation` | None | Bare `console.error` |
| Reject Profile | `ProspectingResults.tsx` → `rejectMutation` | None | Toast only |
| Search UI | `ProspectingSearch.tsx` | None | Toast only |
| Smoke Tests | `system-run-smoke-tests` | — | No prospecting checks |

Zero kernel events. Minimal structured logging.

## Implementation Plan

### A) Kernel Events — Outreach Sent

**`PendingOutreachPanel.tsx` — `markSent`:**
1. Import `emitKernelEvent` + `useWorkspace`. After successful `markSent`, emit `PROSPECT.OUTREACH_SENT` (payload: `profile_id`, `step_index`, `channel: 'instagram'`). Source: `mkt-prospecting`, entity_kind: `prospecting_profile`.

**`BulkOutreachDialog.tsx` — `handleConfirmSent`:**
2. After successful send confirmation, emit `PROSPECT.OUTREACH_SENT` (payload: `profile_id`, `step_index: 1`, `channel: 'instagram'`, `bulk: true`).

### B) Kernel Events — Profile Converted (prospect → lead)

**`ProspectingResults.tsx` — `convertMutation.onSuccess`:**
3. Emit `PROSPECT.CONVERTED` (payload: `profile_id`, `lead_id`, `source: 'manual'`).

**`BulkOutreachDialog.tsx` — `handleConfirmSent` (auto-convert):**
4. After lead creation succeeds, emit `PROSPECT.CONVERTED` (payload: `profile_id`, `lead_id`, `source: 'auto_outreach'`).

### C) Logging — Edge Functions

**`professional-prospecting-search/index.ts`:**
1. After search record created → `console.log('[PROSPECTING] Search started: profession=${profession}, location=${location}')`
2. After results saved → `console.log('[PROSPECTING] Search completed: id=${search.id}, results=${results.length}')`
3. Error → prefix `console.error` with `[PROSPECTING]`

**`professional-prospecting-analyze/index.ts`:**
4. Before AI analysis → `console.log('[PROSPECTING] Analyze: ${profiles.length} profiles')`
5. After analysis → `console.log('[PROSPECTING] Analyzed: ${successCount} ok, ${failCount} failed')`
6. Error → prefix `console.error` with `[PROSPECTING]`

**`generate-prospecting-message/index.ts`:**
7. Before AI call → `console.log('[PROSPECTING] Generate msg: step=${sequenceStep}, tone=${tone}')`
8. After success → `console.log('[PROSPECTING] Message generated: ${message.length} chars')`
9. Error → `console.error('[PROSPECTING] MSG_GENERATE_FAILED', ...)`

**`batch-generate-prospecting-messages/index.ts`:**
10. Start → `console.log('[PROSPECTING] Batch generate: ${profiles.length} profiles')`
11. End → `console.log('[PROSPECTING] Batch done: ${results.length} results, ${errors} errors')`
12. Error → prefix with `[PROSPECTING]`

**`prospecting-outreach-processor/index.ts`:**
13. Start → `console.log('[PROSPECTING] Processor: ${dueItems.length} due items')`
14. Per item → `console.log('[PROSPECTING] Processed: profile=${profileName}, step=${item.step_index}')`
15. Error → prefix with `[PROSPECTING]`

### D) Logging — UI Components

**`PendingOutreachPanel.tsx`:**
1. `generateMessage` error → `console.warn('[PROSPECTING] MSG_GENERATE_FAILED', err)`
2. `markSent` success → `console.log('[PROSPECTING] Outreach sent: profile=${item.profile_id}')`

**`BulkOutreachDialog.tsx`:**
3. `handleReject` error → `console.warn('[PROSPECTING] BULK_REJECT_FAILED', err)`
4. `handleConfirmSent` success → `console.log('[PROSPECTING] Bulk outreach sent: profile=${profile.id}')`
5. Auto-lead creation error → `console.warn('[PROSPECTING] AUTO_LEAD_CREATE_FAILED', err)`

**`ProspectingResults.tsx`:**
6. `convertMutation.onError` → `console.warn('[PROSPECTING] CONVERT_FAILED', error.message)`
7. `rejectMutation.onError` → `console.warn('[PROSPECTING] REJECT_FAILED')`
8. `enrichProfile` error → `console.warn('[PROSPECTING] ENRICH_FAILED', error)`
9. Bulk outreach error → `console.warn('[PROSPECTING] BULK_OUTREACH_FAILED', err)`

**`ProspectingSearch.tsx`:**
10. Search error → `console.warn('[PROSPECTING] SEARCH_FAILED', error)`
11. Analyze error → `console.warn('[PROSPECTING] ANALYZE_FAILED', error)`

### E) Smoke Tests

Add to `system-run-smoke-tests`:
- `professional_prospecting_searches` (module: `mkt-prospecting`)
- `professional_prospecting_profiles` (module: `mkt-prospecting`)
- `prospecting_outreach_queue` (module: `mkt-prospecting`)

## File Plan

| File | Action |
|------|--------|
| `src/components/professional-prospecting/PendingOutreachPanel.tsx` | Import `emitKernelEvent`; emit `PROSPECT.OUTREACH_SENT`; add `[PROSPECTING]` logging |
| `src/components/professional-prospecting/BulkOutreachDialog.tsx` | Import `emitKernelEvent`; emit `PROSPECT.OUTREACH_SENT` + `PROSPECT.CONVERTED`; add `[PROSPECTING]` logging |
| `src/components/professional-prospecting/ProspectingResults.tsx` | Import `emitKernelEvent`; emit `PROSPECT.CONVERTED`; add `[PROSPECTING]` logging |
| `src/components/professional-prospecting/ProspectingSearch.tsx` | Add `[PROSPECTING]` logging |
| `supabase/functions/professional-prospecting-search/index.ts` | Add `[PROSPECTING]` prefixed logging |
| `supabase/functions/professional-prospecting-analyze/index.ts` | Add `[PROSPECTING]` prefixed logging |
| `supabase/functions/generate-prospecting-message/index.ts` | Add `[PROSPECTING]` prefixed logging |
| `supabase/functions/batch-generate-prospecting-messages/index.ts` | Add `[PROSPECTING]` prefixed logging |
| `supabase/functions/prospecting-outreach-processor/index.ts` | Add `[PROSPECTING]` prefixed logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `professional_prospecting_searches`, `professional_prospecting_profiles`, `prospecting_outreach_queue` checks |

