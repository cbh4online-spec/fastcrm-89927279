

# Passo 3 — Lists Poderosas (Estilo Attio)

## Current State

- **Two view systems exist in parallel**: `core_object_views` (for custom objects via `ObjectViewsManager`) and `crm_saved_views` (for core entities via `AttioViewSelector` / `useCrmViews`). Neither supports filter conditions — they only store `visible_fields` and basic `sort_config`.
- **Filtering is hardcoded**: `SmartContactsFilters`, `SmartFilters` (leads) have static dropdowns, not composable filter conditions.
- **Bulk actions exist** for contacts/opportunities (`BulkActionsBar`) but not for custom objects — the `AttioObjectListView` only has bulk delete.
- **No "Smart List" concept** — the tabs in SmartContactsTable and SmartCompaniesTable show "Listas Inteligentes" but render an empty placeholder.
- **`core_object_views.filters`** is a JSON column already — ready to store structured filter conditions. Same for `crm_saved_views.filters`.

## Architecture Decision

Unify the concept: A **List** is a saved view with filter conditions. Lists are dynamic — records matching the filter appear, records that stop matching disappear. No separate table needed; we extend the existing `core_object_views` (for custom objects) and `crm_saved_views` (for core entities) with structured filter JSON.

### Filter Condition Schema

```text
{
  "conditions": [
    { "field": "budget", "operator": "gte", "value": 10000 },
    { "field": "status", "operator": "eq", "value": "active" },
    { "field": "created_at", "operator": "gte", "value": "2024-01-01" }
  ],
  "logic": "AND"
}
```

Supported operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `is_empty`, `is_not_empty`, `in`, `between`.

Field types determine available operators:
- **text/email/url**: eq, neq, contains, not_contains, is_empty, is_not_empty
- **number/currency**: eq, neq, gt, gte, lt, lte, between, is_empty
- **date**: eq, gt, gte, lt, lte, between, is_empty (+ relative: "last_7_days", "last_14_days", "last_30_days", "today")
- **boolean**: eq
- **select/multi_select**: eq, neq, in, is_empty

## Plan

### 1. New Component: `src/components/objects/AdvancedFilterBuilder.tsx`

Visual filter builder used in both custom objects and core entity list views.

- Renders a list of filter condition rows
- Each row: Field selector → Operator selector (dynamic based on field type) → Value input (type-aware: text input, number input, date picker, select dropdown, boolean toggle)
- "Add condition" button at bottom
- Logic toggle (AND only for now — simple, clean)
- Remove condition button per row
- Compact, inline design — no dialogs, no modals
- Props: `fields: FilterableField[]`, `conditions: FilterCondition[]`, `onChange: (conditions) => void`

### 2. New Component: `src/components/objects/SaveAsListDialog.tsx`

Dialog to save current filter + sort + columns as a named List.

- Input: Name
- Checkbox: "Definir como vista padrão"
- Checkbox: "Partilhar com workspace" (sets `user_id = null`)
- Uses existing `useCreateObjectView` (for custom objects) or `useCreateSavedView` (for core entities)
- Saves the full filter conditions JSON into the `filters` column

### 3. New Hook: `src/hooks/useFilterEngine.ts`

Client-side filter evaluation engine. Takes records + filter conditions → returns matching records.

```text
function applyFilters(records, conditions, logic): filteredRecords
```

- Handles all operator types
- Handles relative date operators ("last_14_days" → computes from `now()`)
- Used in `AttioObjectListView` and can be used in core entity tables
- Pure function, no side effects — lists are inherently dynamic because filtering happens at render time against current data

### 4. Update: `src/components/objects/AttioObjectListView.tsx`

- Add `AdvancedFilterBuilder` below the sort bar (collapsible)
- Add "Filter" button that shows/hides the filter builder
- Apply filter conditions through `useFilterEngine`
- Add "Guardar como Lista" button when filters are active → opens `SaveAsListDialog`
- When a view/list with filters is active, show active filter count badge
- Expand bulk actions: add "Criar Tarefas" button alongside existing delete

### 5. Update: `src/components/objects/ObjectViewsManager.tsx`

- When selecting a view that has `filters` JSON, parse and apply the conditions
- Show filter icon on views that have active filters
- Views with filters = Lists (visual distinction: filter icon instead of eye icon)

### 6. New Component: `src/components/objects/BulkCreateTasksDialog.tsx`

Dialog for bulk creating tasks from selected records.

- Input: Task title template (with `{name}` placeholder)
- Input: Due date
- Select: Priority
- Creates tasks via existing task infrastructure
- Works with any selected records from any object type

### 7. Update: `src/hooks/useCoreObjectFields.ts`

- Add `useUpdateObjectView` mutation (missing — needed to update filters on existing views)

### 8. Integrate into Core Entity Tables

- Add `AdvancedFilterBuilder` to `SmartContactsTable` and `SmartCompaniesTable` "Listas Inteligentes" tab
- Replace the empty placeholder with actual smart list functionality
- Use `crm_saved_views.filters` to persist filter conditions for core entities

## No Database Changes Required

Both `core_object_views.filters` and `crm_saved_views.filters` are already JSON columns. The filter conditions schema is stored as JSON — no migration needed.

## File Summary

| File | Action | Description |
|---|---|---|
| `src/components/objects/AdvancedFilterBuilder.tsx` | **NEW** | Visual filter builder with dynamic operators per field type |
| `src/components/objects/SaveAsListDialog.tsx` | **NEW** | Dialog to save filters as named list/view |
| `src/hooks/useFilterEngine.ts` | **NEW** | Client-side filter evaluation engine |
| `src/components/objects/BulkCreateTasksDialog.tsx` | **NEW** | Bulk task creation from selected records |
| `src/components/objects/AttioObjectListView.tsx` | **EDIT** | Add filter builder, "Save as List", bulk task creation |
| `src/components/objects/ObjectViewsManager.tsx` | **EDIT** | Parse/apply filter conditions from views, filter icon |
| `src/hooks/useCoreObjectFields.ts` | **EDIT** | Add `useUpdateObjectView` mutation |
| `src/components/contacts/SmartContactsTable.tsx` | **EDIT** | Wire smart lists tab with AdvancedFilterBuilder |
| `src/components/companies/SmartCompaniesTable.tsx` | **EDIT** | Wire smart lists tab with AdvancedFilterBuilder |

## Criteria Verification

1. **Create list "Deals without activity in 14 days"** — Use AdvancedFilterBuilder: field `updated_at`, operator `lte`, value "14 days ago" (relative date). Save as List.
2. **Dynamic update** — Lists are evaluated at render time against current data. No caching of membership. If a record's `updated_at` changes to today, it leaves the list automatically.
3. **Bulk create tasks** — Select records in list → "Criar Tarefas" → set title template + due date → tasks created for each selected record.

