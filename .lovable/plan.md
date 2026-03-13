

# Fix: Extension in Public Schema (SUPA_extension_in_public)

## Finding
The `pg_net` extension is installed in the `public` schema. All other extensions are already in the `extensions` schema (following best practices).

## Solution
Move `pg_net` from `public` to `extensions` schema via a migration:

```sql
ALTER EXTENSION pg_net SET SCHEMA extensions;
```

This is a metadata-only change — it moves the extension's objects (functions, types) to the `extensions` schema without data loss. The project already uses the `extensions` schema for other extensions (like `vector`), so this follows the established pattern.

## Risk
- `pg_net` is used internally by the backend for async HTTP requests (webhooks, scheduled jobs). Moving it should be safe as long as the `extensions` schema is in the search path, which it is by default in this project's configuration.
- Non-destructive and reversible.

