

# Phase 2: Already Implemented

After reviewing the codebase, **all three hooks are already fully implemented**:

## `useCompanies.ts` — Soft Delete/Restore
- **Soft delete**: `deleteCompany` sets `deleted_at` timestamp instead of hard deleting (line 248-264)
- **Restore**: `restoreCompany` sets `deleted_at` back to `null` (line 266-282)
- **Query filter**: `companiesQuery` already filters `.is("deleted_at", null)` (line 134)
- **Domain extraction**: `createCompany` auto-extracts domain from website (line 147-149)
- **Core Object fields**: `updateCompany` handles all 22 new columns via `extraFields` array (line 223-226)
- **Company interface**: Includes all new fields (`icp_fit_score`, `pare_score`, `deleted_at`, `domain`, etc.)

## `useCompanyAuditLog.ts` — Already Created
- Queries `companies_audit_log` table by `company_id`
- Returns entries ordered by `changed_at` descending, limited to 100
- Exports `CompanyAuditLogEntry` interface

## `useCompanyScores.ts` — Already Created
- `useUpdateCompanyScores` mutation updates `icp_fit_score` and/or `pare_score`
- Sets `updated_by` for audit trail
- Invalidates both `companies` and `company` query caches
- Shows success/error toasts

**No changes are required.** Phase 2 is complete.

