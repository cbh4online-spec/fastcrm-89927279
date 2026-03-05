

# Core Files — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Entity Documents | `EntityDocumentsSection.tsx` | upload/remove/moveToFolder (inline hook) | None | None (toast only) |
| Contact Documents | `useContactData.ts` | upload/delete | None | None (toast only) |
| Context Attachments | `useContextAttachments.ts` | addUrl/uploadFile/delete | None | None (toast only) |
| Note Attachments | `NotesSection.tsx` | inline upload (storage) | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `entity_documents` or `contact_documents` checks |

## Implementation Plan

### A) Kernel Events + Logging — `src/components/entity/EntityDocumentsSection.tsx`

The `useEntityDocuments` hook is defined inline in this file. Add `emitKernelEvent` import and workspace context.

Events (`source_module: 'core-files'`, `entity_kind: 'entity_document'`):
1. `upload.onSuccess` → `FILE.UPLOADED` (payload: `entity_type`, `entity_id`, `document_type`, `file_name`, `file_size`, `folder`)
2. `remove.onSuccess` → `FILE.DELETED`
3. `moveToFolder.onSuccess` → `FILE.MOVED` (payload: `folder`)
4. All errors → `console.warn('[FILES] ..._FAILED')`
5. All successes → `console.log('[FILES] ...')`

### B) Kernel Events + Logging — `src/components/contacts/eni/useContactData.ts`

Add `emitKernelEvent` import. Events (`source_module: 'core-files'`, `entity_kind: 'contact_document'`):
1. `uploadDocument.onSuccess` → `FILE.UPLOADED` (payload: `contact_id`, `document_type`, `file_name`, `file_size`)
2. `deleteDocument.onSuccess` → `FILE.DELETED`
3. All errors → `console.warn('[FILES] ..._FAILED')`

### C) Kernel Events + Logging — `src/hooks/useContextAttachments.ts`

Add `emitKernelEvent` import. Events (`source_module: 'core-files'`, `entity_kind: 'context_attachment'`):
1. `useAddUrlAttachment.onSuccess` → `FILE.UPLOADED` (payload: `attachment_type: 'url'`, `block_id`, `name`)
2. `useUploadFileAttachment.onSuccess` → `FILE.UPLOADED` (payload: `attachment_type: 'file'`, `block_id`, `file_name`, `file_size`)
3. `useDeleteAttachment.onSuccess` → `FILE.DELETED`
4. All errors → `console.warn('[FILES] ..._FAILED')`

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `entity_documents` table check
- `contact_documents` table check

## File Plan

| File | Action |
|------|--------|
| `src/components/entity/EntityDocumentsSection.tsx` | Add kernel events + `[FILES]` logging to inline `useEntityDocuments` hook |
| `src/components/contacts/eni/useContactData.ts` | Add kernel events + `[FILES]` logging to document mutations |
| `src/hooks/useContextAttachments.ts` | Add kernel events + `[FILES]` logging to all mutations |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `entity_documents` and `contact_documents` checks |

