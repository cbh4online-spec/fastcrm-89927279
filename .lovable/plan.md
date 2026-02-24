

# Objects MVP — "Attio Mode"

## Current State Analysis

The codebase already has mature, feature-rich components for each entity:

- **Contacts**: `SmartContactsTable` (908 lines), `ENIContactDetailWithSidebar` (589 lines) — full search, filters, columns, bulk actions, detail with sidebar menu
- **Companies**: `SmartCompaniesTable`, `CompanyDetailWithSidebar` — similar feature set
- **Deals/Opportunities**: `OpportunitiesModule` (kanban + table views), `OpportunityDetailPage` — full pipeline management

**Current `/dashboard/objects`** page (`ObjectsPage.tsx`) is a simple Tabs component that embeds `SmartContactsTable`, a basic `CompaniesTab`, and `SmartLeadsTable` under tabs. It does NOT have:
- Dedicated `/objects/contacts`, `/objects/companies`, `/objects/deals` routes
- An "Objects Home" with cards
- Detail views at `/objects/:type/:id`
- Integration with `core_object_fields` (custom fields from Sprint 1)

**Key insight**: The existing list + detail components are production-quality. The goal is NOT to rewrite them, but to:
1. Create a routing layer under `/objects/*`
2. Build an Objects Home page
3. Wire existing components into the new routes
4. Add custom fields rendering from `core_object_fields`
5. Keep legacy routes working via redirects

## Plan

### 1. Object Registry Config

**New file: `src/config/objectRegistry.ts`**

A static registry mapping object types to their underlying table, list component, detail component, icon, and routes:

```text
OBJECT_REGISTRY = {
  contacts: {
    slug: "contacts",
    label: "Contacts", 
    icon: Users,
    table: "contacts",
    listComponent: SmartContactsTable,
    detailComponent: ENIContactDetailWithSidebar,
    legacyListPath: "/dashboard/contacts",
    legacyDetailPath: "/dashboard/contacts/:id",
    objectsPath: "/objects/contacts",
    objectsDetailPath: "/objects/contacts/:id",
  },
  companies: { ... SmartCompaniesTable / CompanyDetailWithSidebar },
  deals: { ... OpportunitiesModule / OpportunityDetailPage, table: "opportunities" },
}
```

This is the source of truth for the Objects UI. No DB query needed — it's config.

### 2. Objects Home Page

**New file: `src/pages/ObjectsHomePage.tsx`**

Route: `/objects` (also `/dashboard/objects` redirects here)

UI:
- Header: "Objects" + description
- Grid of cards for Contacts, Companies, Deals (from `OBJECT_REGISTRY`)
  - Each card shows: icon, name, record count (fetched via simple count queries), link to `/objects/:type`
- "Create Custom Object" button (disabled/coming soon badge for MVP)
- Link to Custom Objects manager for existing custom objects

### 3. Object List Pages

**New file: `src/pages/ObjectListPage.tsx`**

Route: `/objects/:type` (e.g. `/objects/contacts`)

- Reads `:type` from params
- Looks up `OBJECT_REGISTRY[type]`
- Renders the existing list component (`SmartContactsTable`, `SmartCompaniesTable`, `OpportunitiesModule`)
- Adds `SavedViewsDropdown` in header
- Wraps in `DashboardLayout`

This is a thin wrapper — all the table logic (search, filters, sort, columns) already exists in the Smart*Table components.

### 4. Object Detail Pages

**New file: `src/pages/ObjectDetailPage.tsx`**

Route: `/objects/:type/:id`

- Reads `:type` and `:id` from params
- Looks up registry to render the correct detail component
- For contacts: renders `ENIContactDetailWithSidebar` (already reads `id` from `useParams`)
- For companies: renders `CompanyDetailWithSidebar`
- For deals: renders `OpportunityDetailPage`
- Wraps in `DashboardLayout`

**Important**: The existing detail components already use `useParams` to get the `id`. They will work as-is because the route param name is the same.

### 5. Custom Fields Integration

**Edit: `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`** (and similar for companies/deals)

Add a `ProfileCustomFieldsSection` (already exists in the codebase!) or a new `ObjectCustomFieldsSection` that:
- Fetches `core_object_fields` for the object type (contacts/companies/deals)
- Reads values from the entity record or a JSONB `custom_data` column
- Renders fields using the existing `DynamicRecordForm` component from Sprint 1

For the list views, custom fields can appear as additional columns via the existing `ColumnSelector` system — each `SmartContactsTable` already supports configurable columns.

**Note**: For MVP, custom fields for core objects (contacts/companies/deals) will need a mapping. The `core_object_fields` table references `object_id` (UUID of a `custom_objects` record). For core objects, we'll create "system" entries in `custom_objects` for contacts, companies, and deals (is_system=true), so custom fields can be attached to them.

### 6. Routes & Redirects

**Edit: `src/App.tsx`**

Add new routes:
```text
/objects              → ObjectsHomePage
/objects/contacts     → ObjectListPage (type=contacts)
/objects/companies    → ObjectListPage (type=companies) 
/objects/deals        → ObjectListPage (type=deals)
/objects/:type/:id    → ObjectDetailPage
```

Update `/dashboard/objects` to redirect to `/objects`.

Legacy routes stay intact:
- `/dashboard/contacts` still works (existing `Contacts` page)
- `/dashboard/contacts/:id` still works
- `/dashboard/companies`, `/dashboard/companies/:id` still work
- `/dashboard/opportunities`, `/dashboard/opportunities/:id` still work

### 7. Navigation Update

**Edit: `src/config/nav.v2.ts`**

Change Objects href from `/dashboard/objects` to `/objects`.

### 8. Seed System Objects

**DB migration**: Insert 3 system records into `custom_objects` for contacts, companies, deals (with `is_system=true`). This allows `core_object_fields` to reference them for custom fields on core entities.

## Files Summary

| File | Action |
|---|---|
| `src/config/objectRegistry.ts` | Create — registry mapping types to components |
| `src/pages/ObjectsHomePage.tsx` | Create — cards grid for Contacts/Companies/Deals |
| `src/pages/ObjectListPage.tsx` | Create — thin wrapper rendering existing list components |
| `src/pages/ObjectDetailPage.tsx` | Create — thin wrapper rendering existing detail components |
| `src/App.tsx` | Edit — add `/objects/*` routes, redirect `/dashboard/objects` |
| `src/config/nav.v2.ts` | Edit — update Objects href to `/objects` |
| `src/pages/ObjectsPage.tsx` | Keep — still used for legacy route, will redirect |
| Migration SQL | Create — seed 3 system records in `custom_objects` |

## What This Does NOT Do (deferred)

- No rewrite of existing Smart*Table components — they already have search, filters, sort, columns
- No new Activity timeline component — existing detail pages already have timelines
- No Intelligence sidebar — placeholder can be added later
- No URL migration for legacy routes — they stay as-is

## Acceptance Criteria

- `/objects` shows a home page with Contacts, Companies, Deals cards
- `/objects/contacts` shows the full SmartContactsTable with all existing features
- `/objects/companies` shows the full SmartCompaniesTable
- `/objects/deals` shows the OpportunitiesModule (kanban + table)
- `/objects/:type/:id` opens the correct detail view
- `/dashboard/contacts`, `/dashboard/companies/:id`, etc. continue to work
- Saved views dropdown works on each list page
- Custom fields can be defined per object type (via core_object_fields)

