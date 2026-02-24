

# Intelligence Panel v1 — Backend Edge Function + Frontend Migration

## Current State

The Intelligence Panel v1 **already exists client-side**: `useDealIntelligence` hook computes health scores locally, `DealIntelligencePanel` renders in the deal sidebar, `DealHealthBadge` shows in the deals table, and `useBulkDealIntelligence` fetches activities/tasks for batch scoring. All scoring runs in the browser.

The user now wants to **move scoring to a backend edge function** with proper API endpoints, matching the exact payload shape specified, including a `debug` object and a batch endpoint.

## What Changes

### 1. Edge Function: `deal-intelligence`

**New file: `supabase/functions/deal-intelligence/index.ts`**

Single edge function handling two modes via query params:

- **Single deal**: `POST` with body `{ deal_id: "uuid" }` — returns the full payload (health_score, health_label, risk_drivers, next_best_action, data_completeness, debug)
- **Batch deals**: `POST` with body `{ deal_ids: ["a","b","c"] }` — returns compact `{ items: { dealId: { health_score, health_label, top_reason } } }`

Implementation details:
- Uses `X-Workspace-Id` header for workspace context (following existing convention from `product-ai-improve`, `product-quick-create`, etc.)
- Auth via `Authorization` header — creates user-scoped Supabase client
- Service role client for data queries (bypasses RLS for cross-table reads)
- **Scoring logic**: Transplants the exact same heuristic from `useDealIntelligence.ts` (100 minus penalties) into the edge function
- Parallel data fetch: opportunity + activities + tasks in `Promise.all`
- For batch: fetches all opportunities, activities, and tasks in 3 queries using `.in()`, then maps per deal
- Returns `debug` block with `last_activity_days`, `has_next_step`, `stage_days`
- **No caching in v1** — queries are fast enough with parallel fetch; cache can be added later via a `deal_intelligence_cache` table

### 2. Frontend Hook: `useDealIntelligenceAPI`

**New file: `src/hooks/useDealIntelligenceAPI.ts`**

Two hooks:
- `useDealIntelligenceAPI(dealId)` — calls the edge function for a single deal, returns the full payload. Uses `react-query` with 5-min stale time for implicit caching.
- `useBulkDealIntelligenceAPI(dealIds)` — calls the batch endpoint, returns a `Map<string, CompactIntelligence>`

Both invoke via `supabase.functions.invoke("deal-intelligence", { body: {...}, headers: { "X-Workspace-Id": ... } })`.

### 3. Update `OpportunityDetailPage.tsx`

**Edit existing file**

Replace:
- Remove imports of `useDealIntelligence`, `useActivities` (for intelligence), `useTasks` (for intelligence)
- Import `useDealIntelligenceAPI` instead
- Call `useDealIntelligenceAPI(opportunityId)` — returns the full payload
- Pass the API response to `DealIntelligencePanel` (needs minor prop type update)

Note: activities and tasks are still fetched for their own display purposes (timeline, tasks tab) — we just stop using them for scoring.

### 4. Update `DealIntelligencePanel.tsx`

**Edit existing file**

Update the `DealIntelligence` type to match the API payload shape:
- `health_score` (snake_case from API)
- `health_label`: `"HEALTHY" | "WATCH" | "AT_RISK"` (uppercase from API)
- `risk_drivers`: `{ reason: string, severity: "HIGH" | "MEDIUM" | "LOW" }[]`
- `next_best_action`: `{ title, type, payload }` with `payload.suggested_due_days`, `suggested_title`, `suggested_priority`
- `data_completeness`: `{ percent, missing_fields }`

Adapt the component to use these shapes. The `CreateTaskFromIntelligence` component gets updated to use `suggested_title` and `suggested_due_days` from the NBA payload.

### 5. Update `DealHealthBadge.tsx`

**Edit existing file**

Update to accept the compact batch payload type: `{ health_score, health_label, top_reason }`.

### 6. Update `OpportunitiesModule.tsx` + `OpportunityTableView.tsx`

**Edit existing files**

Replace `useBulkDealIntelligence` with `useBulkDealIntelligenceAPI`. Pass the batch results to the table view.

### 7. Types File

**New file: `src/types/dealIntelligence.ts`**

Shared TypeScript types for both API payload shapes (single + batch), used by the hook and components.

### 8. Telemetry

Add activity logging for:
- `intelligence_panel_opened` — when panel mounts/opens
- `nba_clicked` — when user clicks the NBA CTA
- `task_created_from_intelligence` — on successful task creation

Uses existing `crm_activities` table with `activity_type` set to these values. Implemented as simple `supabase.from("crm_activities").insert(...)` calls in the components.

## Files Summary

| File | Action |
|---|---|
| `supabase/functions/deal-intelligence/index.ts` | **Create** — edge function with single + batch scoring |
| `src/types/dealIntelligence.ts` | **Create** — shared TypeScript types for API payloads |
| `src/hooks/useDealIntelligenceAPI.ts` | **Create** — hooks calling the edge function |
| `src/components/intelligence/DealIntelligencePanel.tsx` | **Edit** — use API payload types |
| `src/components/intelligence/DealHealthBadge.tsx` | **Edit** — use batch payload type |
| `src/components/intelligence/CreateTaskFromIntelligence.tsx` | **Edit** — use NBA payload for prefill |
| `src/components/opportunities/OpportunityDetailPage.tsx` | **Edit** — swap to API hook |
| `src/components/opportunities/OpportunitiesModule.tsx` | **Edit** — swap to batch API hook |
| `src/components/opportunities/OpportunityTableView.tsx` | **Edit** — update healthMap type |

Old files `useDealIntelligence.ts` and `useBulkDealIntelligence.ts` remain for backward compat but are no longer imported by the main views.

## Technical Notes

- The edge function follows the project's established pattern: `X-Workspace-Id` header, CORS with the extended header list, service role for data access
- `verify_jwt = false` in config.toml with manual auth validation in the function (same as other functions)
- Batch endpoint caps at 50 IDs per request to prevent overload
- Scoring heuristic is identical to the existing client-side logic — just moved server-side for the architecture the user wants
- React Query provides implicit 5-min caching, meeting the "< 500ms with cache" requirement
- No new database tables needed

