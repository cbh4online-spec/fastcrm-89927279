
# Fix: Bio OS module not found during install

## Problem
The `marketplace_modules` table has an RLS policy that only allows reading modules where `status = 'active'`. The Bio OS module was inserted with `status = 'published'`, so the Supabase client query `.eq("slug", "bio-os").single()` returns no results, causing the "Modulo nao encontrado" error.

## Solution
Update the Bio OS module's status from `'published'` to `'active'` in the database.

## Technical Details

**Single SQL update** (via data operation):
```sql
UPDATE marketplace_modules SET status = 'active' WHERE slug = 'bio-os';
```

This is a data-only change -- no code files need to be modified.

## Root Cause Note
The original SQL migration likely used `status = 'published'` instead of `status = 'active'`. Future module inserts should always use `status = 'active'` to match the RLS policy filter.
