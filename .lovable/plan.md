

# Hide Nav Items Based on Feature Flags

## Current State

- `NAV_V2_ITEMS` in `nav.v2.ts` is a static array of 8 items — no flag association
- `Sidebar.tsx` iterates all items unconditionally
- Feature flags exist with keys `marketplace`, `objects`, `intelligence` (per `FLAG_META` in `useAllFeatureFlags.ts`)
- `useFeatureFlags()` already fetches all flags for the current workspace in one query (cached 5 min)

## Plan

### 1. Add optional `featureFlag` property to nav items

**Edit: `src/config/nav.v2.ts`**

Add a `featureFlag?: string` field to three items:
- Objects → `"objects"`
- Intelligence → `"intelligence"`
- Marketplace → `"marketplace"`

Items without `featureFlag` are always visible.

### 2. Filter nav items in `Sidebar.tsx`

**Edit: `src/components/layout/Sidebar.tsx`**

- Import `useFeatureFlags` (the bulk hook that returns all flags at once — already cached, no extra queries)
- Before rendering, filter `navItems`: keep items where `featureFlag` is undefined OR the corresponding flag is enabled
- While flags are loading, show all items (avoid flash of missing nav)

### 3. Same filtering in `SidebarV1.tsx`

The V1 sidebar uses `nav.v1.ts` which has different items (no Objects/Intelligence/Marketplace), so no changes needed there.

## Files

| File | Action |
|---|---|
| `src/config/nav.v2.ts` | **Edit** — add `featureFlag` to 3 items |
| `src/components/layout/Sidebar.tsx` | **Edit** — filter items by enabled flags |

## Technical Notes

- Uses the existing `useFeatureFlags()` hook which is already called in `DashboardLayout` (shared React Query cache — zero extra network requests)
- Flag keys match the ones in `FLAG_META`: `marketplace`, `objects`, `intelligence`
- During loading state, all items remain visible to prevent layout shift

