

# Fix: System Not Updating After Module Installation

## Root Cause

The `extension-provisioner` edge function has **column name mismatches** with the actual database schema. When a module is installed, the `workspace_modules` row is created (module appears as "installed"), but all subsequent provisioning steps (objects, fields, views) fail silently because the SQL references non-existent columns.

**Postgres logs confirm:** `column core_object_types.type does not exist`

### Column Mismatches Found

| Table | Provisioner Uses | Actual Column |
|-------|-----------------|---------------|
| `core_object_types` | `type` | `slug` |
| `core_object_types` | `label` | `name` |
| `core_object_types` | `label_pt` | *(doesn't exist)* |
| `core_object_types` | `source_table` | *(doesn't exist)* |
| `core_object_fields` | `object_type_id` | `object_id` |
| `core_object_fields` | `key` | `slug` |
| `core_object_fields` | `type` | `field_type` |
| `core_object_fields` | `label` | `name` |
| `core_object_views` | `object_type_id` | `object_id` |
| `core_object_views` | `filter` | `filters` |

## Fix

### 1. Update `extension-provisioner` edge function

Correct all column references to match the actual database schema:

- **core_object_types**: Use `slug` instead of `type`, `name` instead of `label`, remove `label_pt` and `source_table`
- **core_object_fields**: Use `object_id` instead of `object_type_id`, `slug` instead of `key`, `field_type` instead of `type`, `name` instead of `label`
- **core_object_views**: Use `object_id` instead of `object_type_id`, `filters` instead of `filter`
- Add proper error logging for each provisioning step so failures are visible

### 2. Update manifest interfaces

Align the `ManifestObjectDef`, `ManifestFieldDef`, and `ManifestViewDef` interfaces to reflect usable fields.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/extension-provisioner/index.ts` | Fix all column name references to match actual DB schema; add error logging per step |

