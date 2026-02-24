

# Intelligence Panel v1 — Backend Edge Function + Frontend

## Current State

- **Deal-level intelligence** is fully API-backed: `deal-intelligence` edge function with caching, consumed by `useDealIntelligenceAPI` and `useBulkDealIntelligenceAPI`
- **Old client-side hooks** (`useDealIntelligence.ts`, `useBulkDealIntelligence.ts`) still exist but are **not imported by any component** — dead code
- **Intelligence page** (`IntelligencePage.tsx`) has 3 tabs: Assist (chat), Analyze (revenue forecast), Automate (automation generator) — but **no portfolio-level deal intelligence overview**
- The `strategic-intelligence-brief` edge function generates weekly AI briefs but is separate
- The `DashboardAIInsightsPanel` shows generic dashboard insights, not deal health aggregation

## What We'll Build

A workspace-level **Intelligence Panel v1** that aggregates deal health across the portfolio — showing distribution of healthy/watch/at-risk deals, top risks, and recommended actions — powered by a new edge function.

## Plan

### 1. Create edge function: `intelligence-panel`

**Create: `supabase/functions/intelligence-panel/index.ts`**

This function aggregates deal intelligence across all open opportunities in the workspace:

- Auth validation via `getClaims()`
- Requires `X-Workspace-Id` header
- Queries all open opportunities, then calls the existing `deal_intelligence_cache` table to get cached scores (or computes missing ones using the same `scoreDeal` logic)
- Returns aggregated response:

```json
{
  "total_open": 15,
  "health_distribution": { "HEALTHY": 8, "WATCH": 4, "AT_RISK": 3 },
  "avg_health_score": 67,
  "top_risks": [
    { "deal_id": "...", "deal_title": "...", "reason": "No activity in 21 days", "severity": "HIGH", "health_score": 25 }
  ],
  "recommended_actions": [
    { "deal_id": "...", "deal_title": "...", "action": "Schedule a follow-up within 48h", "type": "FOLLOW_UP", "priority": "HIGH" }
  ],
  "data_quality": { "avg_completeness": 78, "deals_missing_value": 3, "deals_missing_close_date": 5 },
  "computed_at": "2026-02-24T..."
}
```

- `top_risks`: top 5 risk drivers across all deals, sorted by severity + score
- `recommended_actions`: top 5 next-best-actions from worst-scoring deals
- Reuses the `scoreDeal` function (extracted into the function or computed from cache)

### 2. Create frontend hook: `useIntelligencePanel`

**Create: `src/hooks/useIntelligencePanel.ts`**

- Calls `supabase.functions.invoke("intelligence-panel")` with workspace header
- React Query with 5-minute stale time
- Returns typed data matching the edge function response
- Exposes a `refetch` function for manual refresh

### 3. Create frontend component: `IntelligenceOverviewPanel`

**Create: `src/components/intelligence/IntelligenceOverviewPanel.tsx`**

A dashboard-style panel with:
- **Health Distribution** — 3 colored cards (Healthy/Watch/At Risk) with counts and a donut or bar visualization
- **Average Health Score** — large number with color coding
- **Top Risks** — list of top 5 at-risk deals with their primary risk reason, linking to deal detail
- **Recommended Actions** — top 5 NBAs from worst deals with action buttons
- **Data Quality** — progress bar showing average completeness, counts of missing fields
- Refresh button calling the hook's refetch
- Loading skeleton state

### 4. Add to Intelligence page as a new tab

**Edit: `src/pages/IntelligencePage.tsx`**

- Add a new "Overview" tab (first position, before Assist)
- Icon: `LayoutDashboard` from lucide
- Renders `<IntelligenceOverviewPanel />`
- Set as default tab (`activeTab` defaults to `"overview"` instead of `"assist"`)

### 5. Clean up dead code

**Delete: `src/hooks/useDealIntelligence.ts`** — no longer imported anywhere
**Delete: `src/hooks/useBulkDealIntelligence.ts`** — no longer imported anywhere

### 6. Config update

**Edit: `supabase/config.toml`** — add:
```toml
[functions.intelligence-panel]
verify_jwt = false
```

## Files Summary

| File | Action |
|---|---|
| `supabase/functions/intelligence-panel/index.ts` | **Create** — workspace-level intelligence aggregation |
| `supabase/config.toml` | **Edit** — register new function |
| `src/hooks/useIntelligencePanel.ts` | **Create** — React Query hook for the edge function |
| `src/components/intelligence/IntelligenceOverviewPanel.tsx` | **Create** — overview dashboard panel |
| `src/pages/IntelligencePage.tsx` | **Edit** — add Overview tab as default |
| `src/hooks/useDealIntelligence.ts` | **Delete** — dead code (no importers) |
| `src/hooks/useBulkDealIntelligence.ts` | **Delete** — dead code (no importers) |

## Technical Details

- The edge function queries `deal_intelligence_cache` first, then computes for any uncached deals — leveraging the cache infrastructure from the previous iteration
- Auth follows project conventions: `getClaims()` validation, `X-Workspace-Id` header, service role client for data queries
- The `top_risks` and `recommended_actions` arrays are capped at 5 items to keep the response compact
- CORS headers follow the project pattern with all required headers
- The cleanup of dead hooks is safe — verified zero imports in any `.tsx` file

