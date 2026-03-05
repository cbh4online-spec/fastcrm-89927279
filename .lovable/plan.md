

# CRM Contacts — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Contact CRUD | `useContacts.ts` | create/update/delete/restore/bulk | None | Toast + `console.error` |
| Merge | `useContactMerge.ts` | merge duplicates + migrate refs | None | Toast + `console.error` |
| Audit | `useContactAuditLog.ts` | read-only | N/A | None |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `contacts` check |

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useContacts.ts`

Import `emitKernelEvent`. All events: `source_module: 'crm-contacts'`, `entity_kind: 'contact'`.

1. `createContact.onSuccess` → `CONTACT.CREATED` (payload: `has_email`, `has_company`, `has_tax_id`, `auto_linked_company`)
2. `updateContact.onSuccess` → `CONTACT.UPDATED` (payload: `fields_changed`)
3. `deleteContact.onSuccess` → `CONTACT.DELETED` (soft delete)
4. `restoreContact.onSuccess` → `CONTACT.RESTORED`
5. `deleteContacts.onSuccess` → `CONTACT.BULK_DELETED` (payload: `count`)
6. `bulkUpdateContacts.onSuccess` → `CONTACT.BULK_UPDATED` (payload: `count`)
7. All errors → `console.warn('[CONTACTS] ..._FAILED')`
8. All successes → `console.log('[CONTACTS] ...')`

### B) Kernel Events + Logging — `src/hooks/useContactMerge.ts`

Import `emitKernelEvent`. Events: `source_module: 'crm-contacts'`, `entity_kind: 'contact'`.

1. `onSuccess` → `CONTACT.MERGED` (payload: `primary_id`, `merged_count`, `fields_enriched`, `tags_merged_count`, `references_migrated`)
2. `onError` → `console.warn('[CONTACTS] MERGE_FAILED', { primaryContactId, duplicateCount })`
3. Add structured logging throughout mutationFn for merge conflict visibility:
   - `console.log('[CONTACTS] Merge started: primary=${id}, duplicates=${count}')`
   - `console.log('[CONTACTS] Merge field enrichment: ${fields}')`  (log which fields were filled from duplicates)
   - `console.log('[CONTACTS] Merge references migrated for ${dupId}')`

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `contacts` table check (module: `crm-contacts`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useContacts.ts` | Import `emitKernelEvent`; emit CRUD events; add `[CONTACTS]` logging |
| `src/hooks/useContactMerge.ts` | Emit `CONTACT.MERGED`; add merge conflict logging with `[CONTACTS]` prefix |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `contacts` table check |

