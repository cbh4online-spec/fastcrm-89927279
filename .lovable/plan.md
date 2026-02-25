

# Passo 2 — Object Builder (Estilo Attio)

## Overview

Create a dedicated full-page Data Model builder at `/settings/data-model` where users can manage all custom objects, their fields, and relationships in a clean, non-technical UI. Also wire RelationshipsPanel into Company detail pages so cross-object relationships are visible everywhere.

## Current State

- `CreateObjectWizard` exists as a dialog (dual-write to `core_object_types` + `custom_objects`)
- `ObjectFieldBuilder` exists but is basic (card-based add form, missing currency/multi-select types)
- `RelationshipsPanel` exists but only used in `CustomObjectDetailPage` — not in Company/Contact detail pages
- `InlineFieldEditor` handles text, number, email, date, url, boolean, select
- No dedicated data model page exists
- Field types missing: `currency`, `multi_select`
- No relationship schema builder (relationships are only created at record level)

## Plan

### 1. New Page: `src/pages/DataModelPage.tsx`

Full-page at `/settings/data-model`. Three-panel layout:

- **Left sidebar (250px)**: List of all objects (core + custom), each showing icon, name, field count. Click to select. "Create Object" button at bottom.
- **Main area**: When an object is selected, shows 3 tabs:
  - **Fields**: Upgraded `ObjectFieldBuilder` with inline add row, drag handles, field type icons
  - **Relationships**: New section showing which objects this one connects to, with ability to create relationship definitions (e.g. "Project → Company")
  - **Settings**: Rename, icon/color picker, description, archive/delete (danger zone)

Design: Clean, minimal. No wizard dialogs. Everything inline. Similar to Attio's Settings > Objects page.

### 2. Upgrade Field Types

Add to `ObjectFieldBuilder` and `InlineFieldEditor`:
- `currency` — number input with currency formatting (stores as number, displays with €/$ prefix)
- `multi_select` — multi-select checkboxes (stores as string array in options)

Update `FIELD_TYPES` in both `ObjectFieldBuilder` and `CreateObjectWizard` to include all types.

### 3. New Component: `src/components/objects/RelationshipSchemaBuilder.tsx`

Shows and manages relationship definitions between object types (not individual records). This is the "schema" level:
- Lists existing relationship patterns: "Project → Company (related_to)"
- "Add relationship" inline: Select target object type → relationship type
- When a relationship definition exists, the `AddRelationshipForm` in `RelationshipsPanel` will pre-filter to only show relevant object types

For now, this is a UI convenience layer — relationships are still stored per-record in `object_relationships`. The schema builder just shows which object pairs have been connected and makes it easy to create new connections.

### 4. Wire RelationshipsPanel into Company Detail

Add `RelationshipsPanel` to `CompanyDetailWithSidebar.tsx` so that when a custom object record (e.g. a "Project") is related to a company, it shows up in the company's sidebar.

Challenge: Companies are core objects stored in the `companies` table, not in `custom_objects`. The `RelationshipsPanel` currently uses `objectId` which references `custom_objects.id`. For core objects, we need to either:
- Create a synthetic `custom_objects` entry for core objects (Companies, Contacts, Deals), or
- Make `RelationshipsPanel` work with a `entityType` + `entityId` pattern

Best approach: Create `custom_objects` entries for core objects if they don't exist (seeded via the wizard or a migration), so the relationship system works uniformly. OR simpler: make the RelationshipsPanel accept an optional `entityType` prop and query relationships by record ID only (which already works since `object_relationships` stores record IDs).

The current `useObjectRelationships(recordId)` already queries by `source_record_id` or `target_record_id` — it will work with company IDs if relationships are created pointing to them. The only issue is that `objectId` is required for `AddRelationshipForm`. We'll make `objectId` optional and handle core entities gracefully.

### 5. Route Registration

Add `/settings/data-model` to `App.tsx`.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/pages/DataModelPage.tsx` | **NEW** | Full-page data model builder with object list sidebar + fields/relationships/settings tabs |
| `src/components/objects/RelationshipSchemaBuilder.tsx` | **NEW** | Object-level relationship viewer/creator |
| `src/components/objects/ObjectFieldBuilder.tsx` | **EDIT** | Add currency + multi_select types, field type icons, inline add row |
| `src/components/objects/CreateObjectWizard.tsx` | **EDIT** | Add currency + multi_select to field type options, add description field |
| `src/components/objects/InlineFieldEditor.tsx` | **EDIT** | Handle currency (number with formatting) and multi_select (checkbox list) |
| `src/components/objects/RelationshipsPanel.tsx` | **EDIT** | Make objectId optional for core entities |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | **EDIT** | Add RelationshipsPanel to sidebar |
| `src/App.tsx` | **EDIT** | Add DataModelPage route at `/settings/data-model` |

## Criteria Verification

1. **Create object "Project"** — via DataModelPage sidebar "Create Object" → name, icon, description inline
2. **Add field "Budget"** — click Project in sidebar → Fields tab → add Budget as `currency` type
3. **Relate with Company** — Relationships tab → add "Company" as related object. Then at record level, use RelationshipsPanel to link specific records
4. **See relationship in Company UI** — CompanyDetailWithSidebar shows RelationshipsPanel with linked Project records

