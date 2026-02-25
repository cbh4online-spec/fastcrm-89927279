

# Enhance DealsSidebar with Attio-style Favorites & Smart Lists

## Current State

The `DealsSidebar.tsx` already has the structure (Favorites, Views, Records, Lists sections) but has these gaps vs the Attio reference:

1. **Lists section hidden when empty** -- should always show with a "Create list" button
2. **No record counts on smart lists** -- `getListCount()` always returns `null`; should compute filtered count using `applyFilters` from the filter engine
3. **Selecting a smart list doesn't filter the Kanban** -- the sidebar calls `onSelectView(list)` but `OpportunitiesModule` doesn't apply the filter conditions from the view to the opportunity list
4. **No "Create list" shortcut** in the Lists section

## Changes

### 1. `DealsSidebar.tsx` -- EDIT

- **Always show Lists section** (remove the `smartLists.length > 0` conditional)
- **Compute actual counts** using `applyFilters` from `useFilterEngine` against the `opportunities` prop, mapping each smart list's filter conditions to a count
- **Add "Create list" button** at the bottom of the Lists section (reuses `onCreateView`)
- **Show count badges** next to each smart list name (e.g., "Inbound Leads 12")

### 2. `OpportunitiesModule.tsx` -- EDIT

- When `activeViewId` points to a view that has filter conditions, apply those conditions to `filteredOpportunities` using `applyFilters`
- Import `applyFilters` and `FilterCondition` from `useFilterEngine`
- In the `filteredOpportunities` memo, after search/hotDeals filters, check if the active view has conditions and apply them

## Technical Details

**Count computation in DealsSidebar:**
```typescript
import { applyFilters, FilterCondition } from "@/hooks/useFilterEngine";

const getListCount = (view: SavedView): number | null => {
  if (!opportunities) return null;
  const f = view.filters as any;
  const conditions: FilterCondition[] = f?.conditions || [];
  if (conditions.length === 0) return null;
  return applyFilters(opportunities as Record<string, unknown>[], conditions, "AND").length;
};
```

**Filter application in OpportunitiesModule:**
In the `filteredOpportunities` memo, add a step that applies the active view's filter conditions when a smart list is selected. This requires passing `views` data (already loaded via `useSavedViews` in the sidebar) or passing the active view's conditions up. The simplest approach: load `useSavedViews("opportunities")` in the module and look up the active view's conditions.

## File Summary

| File | Action | Description |
|---|---|---|
| `src/components/opportunities/DealsSidebar.tsx` | **EDIT** | Always show Lists, compute counts with `applyFilters`, add create button |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Apply smart list filter conditions to opportunity list when active |

## i18n

No new keys needed -- `sidebarLists`, `sidebarCreateView` already exist.

