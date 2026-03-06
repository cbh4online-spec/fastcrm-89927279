

# Fix: Tasks table schema mismatches across Edge Functions

## Problem

The `priority` column was just added and should be working (schema cache refreshes automatically). However, there are **multiple other column mismatches** across edge functions that will cause the same "column not found" errors when those functions run:

### Missing column in database:
- **`description`** — used by 5 edge functions but doesn't exist in the `tasks` table

### Wrong column names in edge functions:
| Edge Function | Uses (wrong) | Should be |
|---|---|---|
| `check-renewals` | `due_date` | `due_at` |
| `workflow-processor` | `due_date` | `due_at` |
| `human-handover` | `due_date` | `due_at` |
| `ingest-product-signal` | `entity_type`, `entity_id` | `related_type`, `related_id` |
| `subscription-webhook` | `entity_type`, `entity_id` | `related_type`, `related_id` |
| `human-handover` | `entity_type`, `entity_id` | `related_type`, `related_id` |
| `workflow-processor` | `lead_id`, `contact_id`, `company_id`, `opportunity_id` | not valid columns |

## Fix

### 1. Database migration
Add `description` column to `tasks` table:
```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;
```

### 2. Fix 5 edge functions
- **`check-renewals/index.ts`**: `due_date` → `due_at`
- **`workflow-processor/index.ts`**: `due_date` → `due_at`, remove `lead_id`/`contact_id`/`company_id`/`opportunity_id`, add `related_type`/`related_id` from `execution.entity_type`/`execution.entity_id`
- **`human-handover/index.ts`**: `due_date` → `due_at`, `entity_type` → `related_type`, `entity_id` → `related_id`
- **`ingest-product-signal/index.ts`**: `entity_type` → `related_type`, `entity_id` → `related_id`
- **`subscription-webhook/index.ts`**: `entity_type` → `related_type`, `entity_id` → `related_id`

All edge functions will be auto-redeployed after changes.

