

# AI-DocInt — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Document Upload & Process | `useKnowledgeBase.ts` | `KNOWLEDGE.DOC_UPLOADED` (added in ai-knowledge stabilization) | `[AI-KNOWLEDGE]` ✓ |
| Edge: knowledge-document-process | `knowledge-document-process/index.ts` | None | `[AI-KNOWLEDGE]` ✓ |
| Edge: knowledge-document-trigger | `knowledge-document-trigger/index.ts` | None | `[KNOWLEDGE-TRIGGER]` prefix (not aligned) |
| Credit Doc Extraction | `useCreditAI.ts` | None | Toast only |
| Edge: ai-credit-analysis (extract mode) | `ai-credit-analysis/index.ts` | None | Unknown |
| Document OCR Page | `AIDocumentOCRPage.tsx` | — | Placeholder only |
| Smoke Tests | `system-run-smoke-tests` | — | No `document_processing_jobs` check |

The ai-docint module piggybacks on knowledge-base infrastructure. Document upload events exist from the ai-knowledge stabilization, but the processing pipeline itself (extraction, OCR, chunking, completion) emits zero kernel events. The `knowledge-document-trigger` edge function still uses `[KNOWLEDGE-TRIGGER]` prefix instead of `[AI-KNOWLEDGE]` or a dedicated `[AI-DOCINT]` prefix. No extraction-complete or manual-review-required events exist.

## Implementation Plan

### A) Kernel Events (source: `ai-docint`)

**`knowledge-document-process/index.ts`:**
1. On successful extraction → emit `DOCINT.EXTRACTED` (entity_kind: `knowledge_source`, payload: `file_name`, `chars_extracted`, `faqs_count`, `topics_count`)
2. On OCR failure/fallback → emit `DOCINT.OCR_FAILED` (entity_kind: `knowledge_source`, payload: `file_name`, `error`)
3. On large-file delegation → emit `DOCINT.DELEGATED` (entity_kind: `knowledge_source`, payload: `file_name`, `file_size_mb`)

**`knowledge-document-trigger/index.ts`:**
4. On successful extraction → emit `DOCINT.EXTRACTED` (same payload)
5. On limitation/partial → emit `DOCINT.MANUAL_REVIEW_REQUIRED` (entity_kind: `knowledge_source`, payload: `file_name`, `reason`)
6. On failure → emit `DOCINT.OCR_FAILED`

**`useCreditAI.ts`:**
7. `extractDocumentData.onSuccess` → emit `DOCINT.EXTRACTED` (entity_kind: `credit_document`, payload: `document_type`, `confidence`)

### B) Logging

**`knowledge-document-trigger/index.ts`:** Align `[KNOWLEDGE-TRIGGER]` → `[AI-DOCINT]` prefix throughout

**`knowledge-document-process/index.ts`:** Add `[AI-DOCINT]` prefix to OCR-specific logs (extraction start, OCR success/failure, PDF conversion). Keep `[AI-KNOWLEDGE]` for knowledge-base operations.

**`useCreditAI.ts`:** Add `[AI-DOCINT]` prefix on extract success/error

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `document_processing_jobs` (module: `ai-docint`) — if table exists, else skip

## Technical Details

Kernel events from edge functions require creating a Supabase client with service role key and inserting directly into `kernel_events` table (edge functions cannot use the `emitKernelEvent` client helper). Pattern:

```typescript
await supabase.from('kernel_events').insert({
  workspace_id: workspaceId,
  type: 'DOCINT.EXTRACTED',
  entity_kind: 'knowledge_source',
  entity_id: sourceId,
  source_module: 'ai-docint',
  actor_type: 'system',
  payload: { file_name: fileName, chars_extracted: textContent.length },
  occurred_at: new Date().toISOString(),
  ingested_at: new Date().toISOString(),
  schema_version: 1,
});
```

## File Plan

| File | Action |
|------|--------|
| `supabase/functions/knowledge-document-process/index.ts` | Emit `DOCINT.EXTRACTED`, `DOCINT.OCR_FAILED`, `DOCINT.DELEGATED`; add `[AI-DOCINT]` prefix to OCR logs |
| `supabase/functions/knowledge-document-trigger/index.ts` | Align `[KNOWLEDGE-TRIGGER]` → `[AI-DOCINT]`; emit `DOCINT.EXTRACTED`, `DOCINT.MANUAL_REVIEW_REQUIRED`, `DOCINT.OCR_FAILED` |
| `src/modules/credit-intermediation/hooks/useCreditAI.ts` | Import `emitKernelEvent`; emit `DOCINT.EXTRACTED` on extract success; add `[AI-DOCINT]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `document_processing_jobs` check under `ai-docint` module |

