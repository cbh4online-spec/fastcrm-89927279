

# Core Custom Fields — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Custom Fields CRUD | `useCustomFields.ts` | create/update/delete/reorder | None | `console.error` + debug logs |
| Custom Field Values | `useCustomFields.ts` | set value (upsert) | None | `console.error` only |
| Core Object Fields | `useCoreObjectFields.ts` | create/update/delete | None | None (toast only) |
| AI Suggestions | `useFieldSuggestions.ts` | generate/accept/reject/dismiss | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `custom_fields` or `custom_field_values` checks |

## Implementation Plan

### A) Kernel Events — `src/hooks/useCustomFields.ts`

Import `emitKernelEvent`. All events: `source_module: 'core-custom-fields'`, `entity_kind: 'custom_field'`.

1. `useCreateCustomField.onSuccess` → `CUSTOM_FIELD.CREATED` (payload: `name`, `field_type`, `entity_type`, `is_unique`, `required`)
2. `useUpdateCustomField.onSuccess` → `CUSTOM_FIELD.UPDATED` (payload: updated keys)
3. `useDeleteCustomField.onSuccess` → `CUSTOM_FIELD.DELETED`
4. `useReorderCustomFields.onSuccess` → `CUSTOM_FIELD.REORDERED` (payload: `count`)
5. `useSetCustomFieldValue.onSuccess` → `CUSTOM_FIELD.VALUE_SET` (entity_kind: `custom_field_value`, payload: `custom_field_id`, `origin`)
6. All errors → `console.warn('[CUSTOM-FIELDS] ..._FAILED')`

### B) Kernel Events — `src/hooks/useCoreObjectFields.ts`

Import `emitKernelEvent`. All events: `source_module: 'core-custom-fields'`, `entity_kind: 'core_object_field'`.

1. `useCreateObjectField.onSuccess` → `CUSTOM_FIELD.CREATED` (payload: `name`, `slug`, `field_type`)
2. `useUpdateObjectField.onSuccess` → `CUSTOM_FIELD.UPDATED`
3. `useDeleteObjectField.onSuccess` → `CUSTOM_FIELD.DELETED`
4. All errors → `console.warn('[CUSTOM-FIELDS] ..._FAILED')`

### C) Kernel Events — `src/hooks/useFieldSuggestions.ts`

Import `emitKernelEvent`. Events: `source_module: 'core-custom-fields'`.

1. `useGenerateFieldSuggestions.onSuccess` → `CUSTOM_FIELD.AI_SUGGESTIONS_GENERATED` (entity_kind: entity's type, payload: `suggestion_count`)
2. `useAcceptSuggestion.onSuccess` → `CUSTOM_FIELD.AI_SUGGESTION_ACCEPTED` (payload: `field_name`, `field_type`, `confidence`)
3. `useRejectSuggestion.onSuccess` → `CUSTOM_FIELD.AI_SUGGESTION_REJECTED`
4. All errors → `console.warn('[CUSTOM-FIELDS] ..._FAILED')`

### D) Observability

All hooks get `[CUSTOM-FIELDS]` prefixed `console.log` on success, `console.warn` on error.

### E) Smoke Tests

Add to `system-run-smoke-tests`:
- `custom_fields` table check
- `custom_field_values` table check
- `core_object_fields` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useCustomFields.ts` | Import `emitKernelEvent`; emit events for all CRUD + value set; add `[CUSTOM-FIELDS]` logging |
| `src/hooks/useCoreObjectFields.ts` | Import `emitKernelEvent`; emit events for field CRUD; add logging |
| `src/hooks/useFieldSuggestions.ts` | Import `emitKernelEvent`; emit AI suggestion events; add logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `custom_fields`, `custom_field_values`, `core_object_fields` checks |

