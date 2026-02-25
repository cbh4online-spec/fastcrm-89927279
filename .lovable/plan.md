

# Redesign Contacts Table — Attio-Style List View

## Overview

Rebuild the Contacts page to match Attio's clean, minimal list view design. Remove the left filter sidebar in favor of inline filter controls. Add a view selector, sort indicators, and advanced filter badges. Cleaner table typography and spacing.

## What Changes

### Current vs Target

```text
CURRENT:                              TARGET (Attio-style):
┌─────────┬──────────────────────┐    ┌──────────────────────────────────┐
│ Filter  │ PageHeader + Tabs    │    │ Contactos ⓘ                     │
│ Sidebar │ Toolbar (search/sort)│    │──────────────────────────────────│
│         │ ┌──────────────────┐ │    │ ⊞ Todos os contactos ▾  ⚙ View │
│ Temp    │ │ Table            │ │    │   settings  ↓ Import/Export ▾   │
│ Estado  │ │                  │ │    │──────────────────────────────────│
│ Ativ.   │ │                  │ │    │ ≡ Sorted by Mais recentes       │
│ ABC     │ └──────────────────┘ │    │   Advanced filter 0  ⋮  +       │
│         │ Pagination           │    │──────────────────────────────────│
└─────────┴──────────────────────┘    │ ☐ Contacto  +  Email  Empresa  │
                                      │ ☐ ◉ João Silva  jo@..  Acme    │
                                      │ ☐ ◉ Maria..     ma@..  Corp    │
                                      │──────────────────────────────────│
                                      │ Pagination (clean)              │
                                      └──────────────────────────────────┘
```

### Key Design Changes

1. **Remove left FilterSidebar** — replace with inline "Advanced filter" badge/popover
2. **New header layout**: Title "Contactos" with info icon, no tabs (tabs become view options)
3. **View selector row**: Dropdown "Todos os contactos ▾" + "View settings" + "Import/Export"
4. **Sort/filter bar**: "Sorted by X" label + "Advanced filter N" badge + more menu + add filter button
5. **Cleaner table**: More whitespace, subtle borders, column headers with "+" to add columns, AI badges on AI columns
6. **Row design**: Avatar with company initial/logo, clickable domains as badges, colored status badges (like ICP Fit), colored currency ranges
7. **Pagination**: Simpler, bottom-aligned

## Technical Plan

### 1. Create `AttioContactsTable.tsx`

New component replacing `SmartContactsTable` with the Attio-inspired layout:

- **Header**: Simple title "Contactos" with count badge and info tooltip
- **View bar**: View selector dropdown (replacing tabs), "View settings" button (opens ColumnSelector), "Import/Export" dropdown
- **Filter bar**: Sort indicator as a styled label, "Advanced filter" badge showing active filter count, "+" button to add filters via popover, "⋮" more menu
- **Table**: Same data source (`useSmartContacts`), same `DynamicTableCell`, but with:
  - Cleaner header styling (lighter text, no background gradient)
  - "+" icon after the first column header (to add columns quickly)
  - AI badge labels on AI columns (small "AI" chip like Attio)
  - Rows with more padding, subtle hover, no strong borders
- **Search**: Integrated into the filter bar as a filter option or a persistent search in the view bar
- **Keeps**: All existing bulk actions, export, create dialog, duplicate management

### 2. Create `AttioFilterBar.tsx`

Reusable inline filter bar component:
- "Sorted by X" styled label (clickable to change sort)
- "Advanced filter N" badge (clickable to open filter popover)
- "⋮" more menu for saved views, export
- "+" button to add new filter criteria
- Filter popover: Select field → operator → value pattern

### 3. Create `AttioViewSelector.tsx`

View selector dropdown:
- Shows current view name with grid icon
- Dropdown lists saved views (from existing page tabs concept)
- "All contacts" as default view

### 4. Update `Contacts.tsx`

- Replace `SmartContactsTable` with `AttioContactsTable`

### 5. Reuse existing infrastructure

- `useSmartContacts` hook — unchanged
- `useContacts` for mutations — unchanged
- `DynamicTableCell` for rendering — unchanged
- `ColumnSelector` / `useColumnPreferences` — unchanged, wired into "View settings"
- `BulkActionsBar` — unchanged
- `CreateContactDialog`, `DuplicateManagementDialog` — unchanged

## Files to Create / Edit

| File | Change |
|---|---|
| `src/components/contacts/AttioContactsTable.tsx` | **NEW** — Main Attio-style contacts list component |
| `src/components/contacts/AttioFilterBar.tsx` | **NEW** — Inline sort + advanced filter bar |
| `src/components/contacts/AttioViewSelector.tsx` | **NEW** — View selector dropdown |
| `src/pages/Contacts.tsx` | Swap `SmartContactsTable` → `AttioContactsTable` |

## Improvements Over Attio

- **AI columns with badges**: Keep the AI-powered columns (Temperature, Score, Type, Next Action) with small "AI" chips, matching Attio's style
- **Bulk actions**: Retain the powerful bulk edit/analyze/LinkedIn analysis — Attio doesn't have this
- **Search**: Keep search as a prominent input in the view bar rather than hidden
- **Temperature indicators**: Colored dots on avatars for hot/warm/cold leads — more visual than Attio's text-only approach
- **Column "+" shortcut**: Allow quickly adding columns from the header, matching Attio's pattern

