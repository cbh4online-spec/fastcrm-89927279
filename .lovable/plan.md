

# CRM Companies — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Company CRUD | `useCompanies.ts` | create/update/delete/restore | None | Toast + `console.error` |
| Merge | `useCompanyMerge.ts` | merge duplicates + migrate refs | None | Toast + `console.error` |
| Enrichment | `useCompanyEnrichment.ts` | enrich + insights | None | `console.error` only |
| NIF Lookup | `useNifLookup.ts` | lookup by NIF | None | `console.error` only |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `companies` check |

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useCompanies.ts`

Import `emitKernelEvent`. All events: `source_module: 'crm-companies'`, `entity_kind: 'company'`.

1. `createCompany.onSuccess` → `COMPANY.CREATED` (payload: `has_email`, `has_tax_id`, `has_website`, `entity_type`)
2. `updateCompany.onSuccess` → `COMPANY.UPDATED` (payload: `fields_changed` keys)
3. `deleteCompany.onSuccess` → `COMPANY.DELETED` (soft delete)
4. `restoreCompany.onSuccess` → `COMPANY.RESTORED`
5. All errors → `console.warn('[COMPANIES] ..._FAILED')`
6. All successes → `console.log('[COMPANIES] ...')`

### B) Kernel Events + Logging — `src/hooks/useCompanyMerge.ts`

Import `emitKernelEvent`. Events: `source_module: 'crm-companies'`, `entity_kind: 'company'`.

1. `onSuccess` → `COMPANY.MERGED` (payload: `primary_id`, `merged_count`, `fields_enriched`)
2. `onError` → `console.warn('[COMPANIES] MERGE_FAILED')`
3. Add structured merge logging throughout `mutationFn`:
   - `console.log('[COMPANIES] Merge started: primary=${id}, duplicates=${count}')`
   - `console.log('[COMPANIES] Merge field enrichment: ${fields}')`
   - `console.log('[COMPANIES] Merge references migrated')`

### C) Kernel Events + Logging — `src/hooks/useCompanyEnrichment.ts`

Import `emitKernelEvent`. Events: `source_module: 'crm-companies'`, `entity_kind: 'company'`.

1. `useCompanyEnrichment.onSuccess` → `COMPANY.ENRICHED` (payload: `fields_found`, `has_social_links`, `source: 'website'`)
2. `useCompanyEnrichment.onError` → `console.warn('[COMPANIES] ENRICH_FAILED')`; prefix existing `console.error`
3. `useCompanyInsights.onSuccess` → `COMPANY.INSIGHTS_GENERATED` (payload: `source: 'ai'`)
4. `useCompanyInsights.onError` → `console.warn('[COMPANIES] INSIGHTS_FAILED')`; prefix existing

### D) Logging — `src/hooks/useNifLookup.ts`

Add `[COMPANIES]` prefixed logging (no kernel events — lookup is read-only):
1. Success → `console.log('[COMPANIES] NIF lookup success: ${nif}')`
2. Error → `console.warn('[COMPANIES] NIF lookup failed: ${nif}')`

### E) Smoke Tests

Add to `system-run-smoke-tests`:
- `companies` table check (module: `crm-companies`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useCompanies.ts` | Import `emitKernelEvent`; emit CRUD events; add `[COMPANIES]` logging |
| `src/hooks/useCompanyMerge.ts` | Emit `COMPANY.MERGED`; add merge conflict logging |
| `src/hooks/useCompanyEnrichment.ts` | Emit `COMPANY.ENRICHED` + `COMPANY.INSIGHTS_GENERATED`; prefix logs |
| `src/hooks/useNifLookup.ts` | Add `[COMPANIES]` prefixed logging for NIF lookups |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `companies` table check |

