

# Fix: Global Super Admin RLS Bypass for All Workspace Tables

## Problem
There are 150+ tables that check `workspace_members` for access but have no `is_super_admin()` bypass. The super admin user gets security errors on almost every operation across the system.

## Solution
Create a single SQL migration that **dynamically** adds a permissive "Super admin full access" policy to every table that:
1. Has existing RLS policies referencing `workspace_members`
2. Does NOT already have an `is_super_admin` bypass

This is done with a PL/pgSQL `DO` block that iterates over the affected tables and creates a single `FOR ALL` policy on each.

### Migration SQL (single file)

```sql
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (p.qual::text LIKE '%workspace_members%' OR p.with_check::text LIKE '%workspace_members%')
      AND p.tablename NOT IN (
        SELECT DISTINCT p2.tablename
        FROM pg_policies p2
        WHERE p2.schemaname = 'public'
          AND (p2.qual::text LIKE '%is_super_admin%' OR p2.with_check::text LIKE '%is_super_admin%')
      )
  LOOP
    -- Drop if exists (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "Super admin full access" ON public.%I', tbl);
    -- Create permissive ALL policy
    EXECUTE format(
      'CREATE POLICY "Super admin full access" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()))',
      tbl
    );
  END LOOP;
END;
$$;
```

### Why this works
- `PERMISSIVE` policies (default) combine with `OR` logic — if any permissive policy passes, access is granted
- A single `FOR ALL` policy covers SELECT, INSERT, UPDATE, DELETE
- The `is_super_admin()` function is already `SECURITY DEFINER` and correctly checks `user_roles` via `profiles`
- Dynamic approach ensures we catch all affected tables without manually listing 150+ names

### What changes
- **1 migration file** — no code changes needed
- All workspace-scoped tables will be accessible to super admins
- Normal users are unaffected (existing policies remain)

