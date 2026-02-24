

# Core Objects System — Database + Code Refactor

## Current State

The database already has 3 tables for the custom objects system:
- **`custom_objects`** — object type definitions (name, slug, icon, color, workspace_id)
- **`object_records`** — JSON blob records linked to a custom_object
- **`object_relationships`** — links between records across objects

Missing pieces:
- **No `object_fields` table** — fields are not defined; records just store arbitrary JSON in `data`
- **No `object_views` table** — there's a separate `crm_saved_views` table but it's not tied to the core objects system
- **No `object_types` table** — no way to categorize or template objects (e.g., system vs custom, CRM vs project)

## Plan

### 1. Database Migration — Create 3 new tables

**`core_object_types`** — Categories/templates for objects (e.g., "CRM", "Projects", "Support")
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK→workspaces | |
| name | text | e.g. "CRM", "Project Management" |
| slug | text | unique per workspace |
| description | text nullable | |
| icon | text default 'box' | |
| color | text default '#6366f1' | |
| is_system | boolean default false | |
| created_at | timestamptz | |

**`core_object_fields`** — Dynamic field definitions per object
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK→workspaces | |
| object_id | uuid FK→custom_objects | Which object this field belongs to |
| name | text | Display name |
| slug | text | Key used in record.data JSON |
| field_type | text | 'text', 'number', 'date', 'select', 'email', 'url', 'boolean', 'relation' |
| is_required | boolean default false | |
| is_system | boolean default false | Prevents deletion of core fields |
| options | jsonb nullable | For select fields: list of options |
| default_value | text nullable | |
| sort_order | int default 0 | Display ordering |
| created_at / updated_at | timestamptz | |

**`core_object_views`** — Saved views per object (filters, sorts, visible columns)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK→workspaces | |
| object_id | uuid FK→custom_objects | |
| name | text | View name |
| filters | jsonb default '{}' | Filter config |
| sort_config | jsonb default '{}' | Sort config |
| visible_fields | text[] nullable | Which field slugs to show |
| is_default | boolean default false | |
| created_by | uuid nullable | |
| created_at / updated_at | timestamptz | |

Also add a `type_id` column to `custom_objects` referencing `core_object_types`.

All tables get RLS policies scoped to workspace membership.

### 2. New Hook — `useCoreObjectFields`

- `useCoreObjectFields(objectId)` — fetch fields for an object, ordered by `sort_order`
- `useCreateObjectField()` — add a field definition
- `useUpdateObjectField()` — edit field name, type, options
- `useDeleteObjectField()` — remove a field
- `useCoreObjectViews(objectId)` — fetch saved views for an object
- `useCreateObjectView()` / `useDeleteObjectView()` — manage views

### 3. Updated UI — `CustomObjectsManager`

Enhance the existing component:
- **Field Builder**: When an object is selected, show a "Fields" tab where users can add/reorder/edit field definitions (name, type, required, options for selects)
- **Dynamic Record Form**: Replace the hardcoded name/notes form with a form generated from `core_object_fields` — render the correct input type per field
- **Dynamic Record Table**: Replace the hardcoded name/notes columns with columns generated from field definitions, respecting `visible_fields` from the active view
- **Views Tab**: Per-object saved views with filter/sort/column visibility

### 4. Object Type Categories (optional enhancement)

- Add a type selector when creating a custom object
- Seed system types: "CRM", "General", "Project" on workspace creation

## Files

| File | Action |
|---|---|
| Migration SQL | Create — 3 new tables + alter `custom_objects` |
| `src/hooks/useCoreObjectFields.ts` | Create — CRUD hooks for fields and views |
| `src/components/objects/ObjectFieldBuilder.tsx` | Create — UI to define fields for an object |
| `src/components/objects/DynamicRecordForm.tsx` | Create — auto-generated form from field defs |
| `src/components/objects/DynamicRecordTable.tsx` | Create — auto-generated table from field defs |
| `src/components/objects/ObjectViewsManager.tsx` | Create — per-object saved views |
| `src/components/objects/CustomObjectsManager.tsx` | Edit — integrate field builder, dynamic forms/tables |
| `src/hooks/useCustomObjects.ts` | Edit — add `type_id` support |

## Technical Details

- Field types supported: `text`, `number`, `date`, `select`, `email`, `url`, `boolean`, `relation`
- Select fields store options in JSONB: `{ "options": ["Option A", "Option B"] }`
- `relation` type stores a reference object_id in options for cross-object lookups
- Dynamic form uses field_type to render: Input, number input, date picker, Select dropdown, Switch, etc.
- Dynamic table columns are generated from `core_object_fields` ordered by `sort_order`
- RLS: all tables use `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`

