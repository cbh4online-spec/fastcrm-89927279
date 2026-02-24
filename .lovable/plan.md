

# Shell V2 — Global Navigation Refactor

## Current State

- **Sidebar.tsx** already has the 8 core items (Home, Objects, Inbox, Automations, Intelligence, Reports, Marketplace, Settings) — this was recently refactored
- **DashboardLayout.tsx** wraps all CRM pages with Sidebar + TopBar
- **App.tsx** has ~130+ routes inside `CRMRoutes()`, all under `/dashboard/*` — no grouping between "core" and "legacy"
- **Feature flags** exist only as a TypeScript interface (`FeatureFlags` in `types/saas.ts`) — no runtime hook, no DB table, no workspace-scoped evaluation
- **No redirect** from `/dashboard/settings` to `/settings` yet
- **No command palette** exists (GlobalSearch is a simple search dialog)

## Plan

### 1. Feature Flags System (DB + Hook)

**New table: `workspace_feature_flags`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK→workspaces | |
| flag_key | text | e.g. `ui.shell_v2_enabled` |
| enabled | boolean default false | |
| created_at | timestamptz | |
| UNIQUE(workspace_id, flag_key) | | |

Seed default flags (all OFF):
- `ui.shell_v2_enabled`
- `ui.nav_v2_enabled`
- `ui.marketplace_enabled`
- `ui.objects_enabled`
- `ui.intelligence_enabled`

**New hook: `src/hooks/useFeatureFlags.ts`**
- `useFeatureFlags()` — fetches all flags for current workspace, cached
- `useFeatureFlag(key: string)` — returns `{ enabled, isLoading }`
- Flags loaded once on workspace boot, cached via React Query (staleTime: 5min)
- Default OFF if flag row doesn't exist

### 2. Navigation Source of Truth

**New file: `src/config/nav.v2.ts`**
- Exports `NAV_V2_ITEMS` — the 8 core sidebar items with `name`, `href`, `icon`, `end?` flag
- This is what `SidebarV2` consumes

**New file: `src/config/routes.legacy.ts`**
- Exports `LEGACY_ROUTES` — array of `{ path, redirect?: string, hidden: true }` for all old `/dashboard/*` routes that should not appear in nav but remain routable
- Used by router to mount legacy routes and by GlobalSearch to index them

### 3. AppShellV2 Layout

**New file: `src/components/layout/AppShellV2.tsx`**
- Same structure as current `DashboardLayout` (auth guard, workspace guard, sidebar + topbar + outlet)
- Imports `SidebarV2` (which is the current `Sidebar.tsx` — already has the 8 items)
- Imports `TopBarV2` (current `TopBar.tsx` — no changes needed)
- Gate: if `ui.shell_v2_enabled` is OFF, falls back to `DashboardLayout`

In practice, since the current Sidebar already has the correct 8 items, `AppShellV2` is essentially the current `DashboardLayout` but flag-gated and prepared to be the single entry point.

### 4. Router Refactor — Legacy Route Group

**Edit: `src/App.tsx`**

Inside `CRMRoutes()`:
- Extract all `/dashboard/*` routes into two groups:
  - **Core routes** (the 8 nav destinations): `/dashboard`, `/dashboard/objects`, `/dashboard/inbox`, `/dashboard/automations`, `/dashboard/intelligence`, `/dashboard/reports`, `/dashboard/marketplace`, `/dashboard/settings`
  - **Legacy routes** (everything else): `/dashboard/leads`, `/dashboard/contacts`, `/dashboard/companies`, `/dashboard/proposals`, etc. — these remain mounted but are hidden from nav

- Add redirect: `/dashboard/settings` → `/settings` (and mount `/settings` + `/settings/:section`)
- All legacy routes render inside `DashboardLayout` (same shell, just not in sidebar)

**No URL changes** for legacy routes — they keep working as-is for deep links and bookmarks.

### 5. Settings URL Cleanup

- Add new routes: `/settings` and `/settings/:section` pointing to same `Settings` component wrapped in `DashboardLayout`
- Add redirect: `/dashboard/settings` → `/settings` and `/dashboard/settings/:section` → `/settings/:section`
- Update Sidebar href from `/dashboard/settings` to `/settings`
- Update TopBar profile menu link to `/settings`

### 6. Feature Flag Admin UI

**New section in Settings page** (under a new "Feature Flags" tab, visible to workspace owners only):
- Toggle switches for each flag
- Changes saved to `workspace_feature_flags` table

## Files

| File | Action |
|---|---|
| Migration SQL | Create — `workspace_feature_flags` table + RLS + seed defaults |
| `src/hooks/useFeatureFlags.ts` | Create — hook to read/toggle flags |
| `src/config/nav.v2.ts` | Create — 8 core nav items (source of truth) |
| `src/config/routes.legacy.ts` | Create — legacy route definitions |
| `src/components/layout/AppShellV2.tsx` | Create — flag-gated shell wrapper |
| `src/components/layout/Sidebar.tsx` | Edit — import nav items from `nav.v2.ts`, update Settings href to `/settings` |
| `src/App.tsx` | Edit — add `/settings` routes, add redirects from `/dashboard/settings`, organize legacy route group |
| `src/components/layout/TopBar.tsx` | Edit — update Settings link to `/settings` |
| `src/components/settings/FeatureFlagsSettings.tsx` | Create — admin UI for toggling flags |

## Technical Details

- Feature flags use workspace-scoped RLS: `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`
- `useFeatureFlag` returns `false` by default (flag OFF) if loading or flag row missing — prevents flicker
- Legacy routes stay at their current URLs; they just don't appear in the sidebar
- The `nav.v2.ts` file becomes the single source of truth for sidebar navigation — any future nav changes happen there
- Settings redirect uses `<Navigate to="/settings" replace />` for `/dashboard/settings` to preserve bookmark compat
- No breaking changes to any existing page component — they all continue to use `DashboardLayout` internally

