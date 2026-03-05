

# Core Imports — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Import History CRUD | `useImportHistory.ts` | create/update record | None | `console.error` only |
| Smart Import Wizard | `SmartImportWizard.tsx` | parse file, process rows, create custom fields | None | `console.error`/`console.warn` |
| Legacy Import Wizard | `ImportWizard.tsx` | parse file, process rows | None | `console.error` only |
| Supplier Import Parse | `supplier-import-parse/index.ts` | parse uploaded file | None | None |
| Supplier Import Commit | `supplier-import-commit/index.ts` | commit matched rows | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `import_history` check |

## Implementation Plan

### A) Kernel Events — `src/hooks/useImportHistory.ts`

Import `emitKernelEvent` + use workspace from context. All events: `source_module: 'core-imports'`, `entity_kind: 'import'`.

1. `useCreateImportRecord.onSuccess` → `IMPORT.STARTED` (payload: `import_type`, `file_name`, `total_rows`, `conflict_policy`)
2. `useUpdateImportRecord.onSuccess` with `status === 'complete'` → `IMPORT.COMPLETED` (payload: `success_count`, `error_count`, `skip_count`)
3. `useUpdateImportRecord.onSuccess` with `status === 'error'` → `IMPORT.FAILED` (payload: `error_count`)
4. All errors → `console.warn('[IMPORTS] ..._FAILED')`

### B) Observability — `src/components/imports/SmartImportWizard.tsx`

Add `[IMPORTS]` prefixed logging:
1. Parse complete: `[IMPORTS] File parsed: ${file.name}, ${rows.length} rows, ${headers.length} columns`
2. Import start: `[IMPORTS] Import started: ${importType}, ${rows.length} rows`
3. Import complete: `[IMPORTS] Import complete: ${result.success} success, ${result.errors} errors, ${result.skipped} skipped`
4. Row-level failure summary at end: `[IMPORTS] Row failures summary: ${errorDetails.length} errors` (log first 10 error details)
5. Custom field creation: `[IMPORTS] Custom field created: ${label}`

### C) Observability — Edge Functions

**`supplier-import-parse/index.ts`:**
1. `[IMPORTS] Parsing file for import: ${import_id}`
2. `[IMPORTS] Parse complete: ${totalRows} rows, ${columns.length} columns`
3. `[IMPORTS] PARSE_FAILED: ${error}`

**`supplier-import-commit/index.ts`:**
1. `[IMPORTS] Committing import: ${import_id}, ${allRows.length} matched rows`
2. `[IMPORTS] Commit complete: ${created} created, ${updated} updated, ${errors} errors`
3. `[IMPORTS] COMMIT_FAILED: ${error}`

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `import_history` table check

### E) Observability — All Client Hooks

All hooks get `[IMPORTS]` prefixed `console.log` on success, `console.warn` on error.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useImportHistory.ts` | Import `emitKernelEvent`; emit `IMPORT.STARTED`/`COMPLETED`/`FAILED`; add `[IMPORTS]` logging |
| `src/components/imports/SmartImportWizard.tsx` | Add `[IMPORTS]` structured logging for parse, import, and row-level failure summary |
| `supabase/functions/supplier-import-parse/index.ts` | Add `[IMPORTS]` structured logging |
| `supabase/functions/supplier-import-commit/index.ts` | Add `[IMPORTS]` structured logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `import_history` check |

