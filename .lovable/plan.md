

# FastCRM 2.0 — Attio-Level Product Foundation

## Vision

Transform the existing infrastructure into a polished, Attio-class experience. The database layer is already solid (custom_objects, core_object_fields, core_object_views, object_records, object_relationships). What's missing is the UI quality and UX coherence to make objects truly first-class citizens.

This plan covers 6 workstreams, ordered by dependency and impact.

---

## Current State Assessment

**What exists:**
- `custom_objects`, `core_object_types`, `core_object_fields`, `core_object_views`, `object_records`, `object_relationships` tables
- Hooks: `useCustomObjects`, `useCoreObjectFields`, `useCreateObjectField`, etc.
- Basic `CreateObjectWizard` (2-step dialog, templates, persists to `core_object_types`)
- `DynamicRecordTable` and `DynamicRecordForm` (functional but rough)
- `ObjectListPage` routes with slug-based dispatch (`/objects/:type`)
- Custom objects appear in sidebar under "Records" section
- `AttioContactsTable` with Attio-style filter bar, view selector, clean table

**What's lacking:**
- Object Builder is a minimal dialog, not a proper settings experience
- Custom object list pages use the basic `CustomObjectsManager` (card grid + inline records), not the Attio-style table
- No relationship management UI (table exists, no hooks or components)
- `ObjectsHomePage` is a simple card grid, not a proper hub
- Detail pages for custom objects don't exist (only core entities have detail views)
- No inline editing on record tables
- Lists feel static — no live record counts, no column customization for custom objects

---

## Workstream 1: Object Builder Redesign

Replace the basic `CreateObjectWizard` dialog with a full-page Object Builder at `/settings/objects` or accessible from `/objects`.

### Changes:

**New: `src/pages/ObjectBuilderPage.tsx`**
- Full page at `/objects/settings/:objectId`
- Three-tab layout: **Fields**, **Views**, **Settings**
- Fields tab: Drag-sortable field list with inline type/required editing, field type icons, "Add field" inline row (not dialog)
- Views tab: Upgraded `ObjectViewsManager` with column checkboxes and drag-order
- Settings tab: Rename, change icon/color, danger zone (archive/delete)
- Breadcrumb: Objects > [Object Name] > Settings

**Upgrade: `src/components/objects/ObjectFieldBuilder.tsx`**
- Replace card-based add form with inline row pattern (click "+" row at bottom, type name, select type, press Enter)
- Add field type icons (text=Type, number=#, date=Calendar, etc.)
- Add drag handle that actually reorders (update sort_order via mutation)
- Inline toggle for required (no dialog)

**Upgrade: `src/components/objects/CreateObjectWizard.tsx`**
- Polish: Add icon picker (grid of lucide icons), color picker (preset palette)
- Add "relation" field type to templates
- After creation, navigate to the object's list page instead of just closing

### Route:
- Add `/objects/settings/:objectId` to App.tsx

---

## Workstream 2: Attio-Style List View for Custom Objects

Custom objects currently use `CustomObjectsManager` which shows records inline under a card. Replace with the same `AttioContactsTable` quality.

### Changes:

**New: `src/components/objects/AttioObjectListView.tsx`**
- Generic list component that works for any custom object
- Props: `objectId`, `objectSlug`, `objectName`
- Uses `useObjectRecords(objectId)` for data, `useCoreObjectFields(objectId)` for columns
- Same layout as `AttioContactsTable`: header with title + count, view bar, filter bar, clean table
- Dynamic columns generated from `core_object_fields`
- Renders cells using upgraded `DynamicRecordTable` cell logic
- Inline "New record" row at top (click → slide-down form)
- Row click → navigate to `/objects/:type/:recordId`
- Checkbox multi-select + bulk delete bar
- Sort by any field, search across all text fields

**Update: `src/pages/ObjectListPage.tsx`**
- For core objects (contacts, companies, deals): keep existing specialized components
- For custom objects (not in `OBJECT_REGISTRY`): render `AttioObjectListView` instead of redirecting to `/objects`
- Lookup custom object by slug from `useCustomObjects` to get `objectId`

**Update: Routes in `App.tsx`**
- `/objects/:type` already works — just need `ObjectListPage` to handle custom types

---

## Workstream 3: Record Detail Page for Custom Objects

Custom object records have no detail view. Add one.

### Changes:

**New: `src/pages/CustomObjectDetailPage.tsx`**
- Route: `/objects/:type/:id` (already exists, but `ObjectDetailPage` only handles core types)
- Two-column layout (Attio-style):
  - **Left (60%)**: Editable fields rendered from `core_object_fields`, activity timeline
  - **Right (40%)**: Relationships panel, metadata (created, updated), quick actions
- Header: Object icon + record title (first text field or "name" field) + breadcrumb
- Inline editing: Click any field value to edit in-place, auto-save on blur
- Activity timeline using existing `UnifiedTimeline`

**Update: `src/pages/ObjectDetailPage.tsx`**
- Add fallback: if `type` is not in `OBJECT_REGISTRY`, look it up in `useCustomObjects` and render `CustomObjectDetailPage`

---

## Workstream 4: Relationship Management UX

The `object_relationships` table exists but has zero UI.

### Changes:

**New: `src/hooks/useObjectRelationships.ts`**
- `useObjectRelationships(recordId)` — fetch all relationships where source or target matches
- `useCreateRelationship()` — create a new link between two records
- `useDeleteRelationship()` — remove a link
- Joins to resolve object names and record display names

**New: `src/components/objects/RelationshipsPanel.tsx`**
- Used in custom object detail pages (right sidebar)
- Shows grouped list of related records by object type
- Each item: icon + record name + relationship type badge + unlink button
- "Add relationship" button → popover: select target object type → search records → link
- Compact, Attio-style with subtle borders and minimal chrome

**New: `src/components/objects/AddRelationshipPopover.tsx`**
- Step 1: Select object type (dropdown of all custom objects + core objects)
- Step 2: Search records within that type
- Step 3: Select relationship type (default: "related_to", options: "parent_of", "child_of", "related_to")
- Creates the relationship via mutation

---

## Workstream 5: Objects Home Page Upgrade

Replace the basic card grid with a proper hub.

### Changes:

**Upgrade: `src/pages/ObjectsHomePage.tsx`**
- **Section 1: Standard Objects** — Contacts, Companies, Deals as horizontal cards with live counts (keep existing)
- **Section 2: Custom Objects** — Same card style but with "Edit" gear icon overlay → links to Object Builder
- **Empty state**: When no custom objects, show a beautiful CTA: "Create your first custom object" with illustration
- Add "Create Object" button that opens the upgraded wizard
- Each card shows: icon, name, record count, last updated, field count badge
- Remove the extension objects section (simplify for now)

---

## Workstream 6: Design System Polish

Ensure all object-related UI matches the Attio-level quality bar.

### Changes:

**Upgrade: `src/components/objects/DynamicRecordTable.tsx`**
- Match `AttioContactsTable` styling: sticky header, `bg-muted/30`, uppercase tracking-wider column labels
- Add checkbox column for multi-select
- Add row hover with subtle background
- Add empty state with illustration
- Column widths: auto-size based on field type

**Upgrade: `src/components/objects/DynamicRecordForm.tsx`**
- Side-panel or slide-down pattern instead of inline card
- Better field spacing, labels above inputs (not inline)
- Auto-focus first field
- Submit on Cmd+Enter

**New: `src/components/objects/InlineFieldEditor.tsx`**
- Click-to-edit component for detail pages
- Shows value as text, click → transforms to input
- Auto-save on blur or Enter
- Type-specific: text input, number input, date picker, select dropdown, boolean toggle

---

## File Summary

| File | Action | Description |
|---|---|---|
| `src/pages/ObjectBuilderPage.tsx` | **NEW** | Full-page object settings (fields, views, settings tabs) |
| `src/components/objects/AttioObjectListView.tsx` | **NEW** | Generic Attio-style list for any custom object |
| `src/pages/CustomObjectDetailPage.tsx` | **NEW** | Record detail with inline editing + relationships |
| `src/hooks/useObjectRelationships.ts` | **NEW** | CRUD hooks for object_relationships table |
| `src/components/objects/RelationshipsPanel.tsx` | **NEW** | Relationship list + add/remove in detail sidebar |
| `src/components/objects/AddRelationshipPopover.tsx` | **NEW** | Search + link records across object types |
| `src/components/objects/InlineFieldEditor.tsx` | **NEW** | Click-to-edit field component |
| `src/pages/ObjectListPage.tsx` | **EDIT** | Handle custom objects with AttioObjectListView |
| `src/pages/ObjectDetailPage.tsx` | **EDIT** | Fallback to CustomObjectDetailPage for non-core types |
| `src/pages/ObjectsHomePage.tsx` | **EDIT** | Polish cards, add field counts, edit links |
| `src/components/objects/CreateObjectWizard.tsx` | **EDIT** | Add icon/color pickers, post-create navigation |
| `src/components/objects/ObjectFieldBuilder.tsx` | **EDIT** | Inline add row, field type icons, drag reorder |
| `src/components/objects/DynamicRecordTable.tsx` | **EDIT** | Attio-style table with checkboxes, sticky headers |
| `src/components/objects/DynamicRecordForm.tsx` | **EDIT** | Better layout, Cmd+Enter submit |
| `src/App.tsx` | **EDIT** | Add ObjectBuilderPage route |

---

## Implementation Order

1. **Workstream 6** (Design polish) — Foundation styling changes
2. **Workstream 2** (Attio list view for custom objects) — Most visible impact
3. **Workstream 3** (Record detail page) — Enables record navigation
4. **Workstream 1** (Object Builder) — Settings/admin quality
5. **Workstream 4** (Relationships) — Advanced data model UX
6. **Workstream 5** (Objects Home upgrade) — Final hub polish

Due to the scope, implementation will be done in 2-3 batches to keep changes reviewable.

