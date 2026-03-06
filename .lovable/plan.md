

# Fix: Missing `created_by` column in `tasks` table

## Problem
The `tasks` table does not have a `created_by` column, but `src/hooks/useAskFastCRM.ts` (line 228) inserts `created_by: user.id` when creating tasks via Command Center quick actions. This causes the error: *"Could not find the 'created_by' column of 'tasks' in the schema cache"*.

## Fix

**Add the missing column via migration:**

```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

No code changes needed — the column will match what `useAskFastCRM.ts` already sends.

