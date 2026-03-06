

# Fix: Missing `priority` column in `tasks` table

Same pattern as the `created_by` fix. The code inserts `priority` when creating follow-up tasks, but the column doesn't exist in the database.

## Fix

Add the missing column via migration:

```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
```

No code changes needed.

