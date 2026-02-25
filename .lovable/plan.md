

# Deals Sidebar Navigation -- Attio-Style Views, Favorites & Lists

## Screenshot Analysis

The Attio screenshot shows a **left sidebar** alongside the Deals Kanban with structured navigation:

1. **Views dropdown** at the top ("Deals overview") with a searchable list of saved views:
   - Deals overview, Marisa's Active Pipeline, New inbound leads, Workspace signups, All Deals, Cassandra's Pipeline, Enterprise Deal Board, US team performance, Marisa: inbound leads
2. **Favorites** section with starred/pinned views
3. **Records** section linking to entity types (Companies, People, Deals, Users, Workspaces, Invoices, Partners)
4. **Lists** section with smart lists (Inbound Leads, Product Launch Campaign, Event Invitees, Customer Success, Onboarding Pipeline, PQL)
5. **"+ Create new view"** button
6. **"+ Add calculation"** footer per Kanban column

## Current State

- `crm_saved_views` table already exists with `entity_type`, `filters`, `sort_config`, `visible_columns`, `view_mode`, `is_default`
- `useSavedViews` hook exists for CRUD operations
- `SavedViewsDropdown` component exists but is a simple dropdown, not a sidebar
- `SmartListsPanel` exists for filter-based lists
- `usePipelines` hook already supports multiple pipelines
- The Opportunities page has no sidebar -- it's a full-width Kanban/table view

## Improvements Over Attio

1. **Favorite views** -- add `is_favorite` column to `crm_saved_views` for pinning views
2. **View icons** -- each view gets a color dot or emoji, not just text
3. **Quick pipeline switcher** -- switch between multiple pipelines directly from sidebar
4. **Smart lists with live counts** -- show deal count badges next to each list
5. **Collapsible sections** -- each section (Views, Favorites, Records, Lists) is collapsible
6. **Drag-to-reorder** favorites
7. **"View settings"** button in header for column visibility, sort defaults

## Database Changes

Add `is_favorite` and `position` columns to `crm_saved_views`:

```sql
ALTER TABLE public.crm_saved_views
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
```

No new tables needed -- we leverage the existing `crm_saved_views` and `pipelines` tables.

## Visual Design

```text
┌──────────────────────┬──────────────────────────────────────────────┐
│  Deals               │  ● Contacted 7  ● Prospecting 19  ...      │
│                      │                                              │
│  🔍 Search views...  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│                      │  │ Card     │ │ Card     │ │ Card     │    │
│  VIEWS               │  │ ...      │ │ ...      │ │ ...      │    │
│  📊 Deals overview   │  │          │ │          │ │          │    │
│  📋 Active Pipeline  │  └──────────┘ └──────────┘ └──────────┘    │
│  📥 Inbound leads    │                                              │
│  👥 All Deals        │                                              │
│  + Create new view   │                                              │
│                      │                                              │
│  FAVORITES           │                                              │
│  ⭐ Enterprise Board │                                              │
│  ⭐ Top Performers   │                                              │
│                      │                                              │
│  RECORDS             │                                              │
│  🏢 Companies        │                                              │
│  👤 People           │                                              │
│  💰 Deals            │                                              │
│  📄 Invoices         │                                              │
│                      │                                              │
│  LISTS               │                                              │
│  🟢 Inbound Leads  5 │                                              │
│  🔵 Product Launch 12│                                              │
│  🟡 Customer Success │                                              │
│  ⋯ All lists         │                                              │
│                      │                                              │
└──────────────────────┴──────────────────────────────────────────────┘
```

## File Plan

| File | Action | Description |
|---|---|---|
| **Database migration** | **NEW** | Add `is_favorite`, `position` columns to `crm_saved_views` |
| `src/components/opportunities/DealsSidebar.tsx` | **NEW** | Full sidebar component with Views, Favorites, Records, Lists sections |
| `src/components/opportunities/CreateViewDialog.tsx` | **NEW** | Dialog to create a new saved view with name, filters, view mode |
| `src/hooks/useSavedViews.ts` | **EDIT** | Add `toggleFavorite` mutation, update types for `is_favorite` |
| `src/components/opportunities/OpportunitiesModule.tsx` | **EDIT** | Wrap in sidebar + content layout, apply selected view filters |
| `src/i18n/locales/pt/crm.json` | **EDIT** | Add ~20 new keys |
| `src/i18n/locales/en/crm.json` | **EDIT** | Same |
| `src/i18n/locales/es/crm.json` | **EDIT** | Same |
| `src/i18n/locales/fr/crm.json` | **EDIT** | Same |

## New i18n Keys (~20)

```
sidebarViews, sidebarFavorites, sidebarRecords, sidebarLists,
sidebarCreateView, sidebarAllLists, sidebarSearchViews,
sidebarDealsOverview, sidebarAllDeals, sidebarNoFavorites,
sidebarToggleFavorite, sidebarViewSettings,
sidebarCompanies, sidebarPeople, sidebarDeals, sidebarInvoices,
sidebarDeleteView, sidebarEditView, sidebarSetDefault
```

## DealsSidebar Component Details

A collapsible sidebar (~240px wide) with four sections using `Collapsible` from Radix:

1. **Search bar** at top -- filters the views list
2. **Views section** -- lists all saved views for `entity_type = "opportunities"`, clickable to apply filters/sort. Active view highlighted. "+ Create new view" button at bottom.
3. **Favorites section** -- views where `is_favorite = true`. Star icon to toggle. Empty state: "No favorites yet".
4. **Records section** -- static navigation links to `/dashboard/companies`, `/dashboard/contacts`, `/objects/deals`, `/dashboard/invoices`. Uses `useNavigate`.
5. **Lists section** -- saved views that have filter conditions (smart lists). Shows live count badge based on filtering against current opportunities. "All lists" link at bottom.

Each view item shows:
- Color dot (derived from view name hash)
- View name (truncated)
- Three-dot menu on hover: Edit, Favorite, Delete, Set as default

## Hook Changes (`useSavedViews.ts`)

Add `useToggleFavorite` mutation:

```typescript
export function useToggleFavorite() {
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      await supabase.from("crm_saved_views").update({ is_favorite }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries(...)
  });
}
```

Update `SavedView` interface to include `is_favorite` and `position`.

## OpportunitiesModule Layout Change

Current: full-width content.
New: `flex` row with sidebar + content:

```tsx
<div className="flex h-full">
  <DealsSidebar
    activeViewId={activeViewId}
    onSelectView={handleSelectView}
    onCreateView={() => setShowCreateView(true)}
  />
  <div className="flex-1 min-w-0 space-y-6">
    {/* existing content */}
  </div>
</div>
```

The sidebar is collapsible via a toggle button (hidden on mobile by default).

## Active View Application

When a view is selected:
1. Its `filters` are applied to the opportunities query
2. Its `sort_config` is applied to sorting
3. Its `view_mode` switches between kanban/list
4. The header updates to show the view name instead of generic "Opportunities"

## Implementation Order

1. Database migration (add columns)
2. Update `useSavedViews` hook with favorite toggle + updated types
3. Add i18n keys to all 4 locales
4. Create `DealsSidebar.tsx` component
5. Create `CreateViewDialog.tsx`
6. Update `OpportunitiesModule.tsx` with sidebar layout and view application logic

## Technical Notes

- No new tables needed -- leverages existing `crm_saved_views`
- Sidebar is responsive: hidden on mobile, toggleable on desktop
- The Records section uses static links, no additional data fetching
- Smart lists count is computed client-side from already-fetched opportunities
- View color dots use a simple hash function on the view name for deterministic colors

