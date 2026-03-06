

# AI-Knowledge — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| KB CRUD | `useKnowledgeBase.ts` | None | `console.error` only |
| Document Upload | `useKnowledgeBase.ts` | None | `console.error` only |
| Entry CRUD | `useKnowledgeBase.ts` | None | `console.error` only |
| Source Processing | `useKnowledgeBase.ts` | None | `console.error` only |
| Semantic Search | `useKnowledgeBase.ts` | None | `console.error` only |
| Edge: knowledge-process | `knowledge-process/index.ts` | None | `[KNOWLEDGE-PROCESS]` prefix ✓ |
| Edge: knowledge-document-process | `knowledge-document-process/index.ts` | None | `[KNOWLEDGE-DOC]` prefix ✓ |
| Edge: knowledge-embedding | `knowledge-embedding/index.ts` | None | Minimal |
| Edge: knowledge-semantic-search | `knowledge-semantic-search/index.ts` | None | Minimal |
| Smoke Tests | `system-run-smoke-tests` | — | Has `knowledge_bases` only |

Zero kernel events in the hook. Edge functions have partial logging but no standardized `[AI-KNOWLEDGE]` prefix. Smoke tests missing `knowledge_entries` and `knowledge_sources`.

## Implementation Plan

### A) Kernel Events (source: `ai-knowledge`)

**`useKnowledgeBase.ts`:**
1. `createKnowledgeBase` success → `KNOWLEDGE.BASE_CREATED` (entity_kind: `knowledge_base`, payload: `name`, `type`)
2. `uploadDocument` success → `KNOWLEDGE.DOC_UPLOADED` (entity_kind: `knowledge_source`, payload: `file_name`, `mime_type`, `knowledge_base_id`)
3. `addSource` success → `KNOWLEDGE.SOURCE_ADDED` (entity_kind: `knowledge_source`, payload: `source_type`, `knowledge_base_id`)
4. `createEntry` success → `KNOWLEDGE.ENTRY_CREATED` (entity_kind: `knowledge_entry`, payload: `entry_type`, `knowledge_base_id`)
5. `validateEntry` success → `KNOWLEDGE.ENTRY_VALIDATED` (entity_kind: `knowledge_entry`)
6. `deleteEntry` success → `KNOWLEDGE.ENTRY_DELETED` (entity_kind: `knowledge_entry`)

### B) Logging (prefix: `[AI-KNOWLEDGE]`)

**`useKnowledgeBase.ts`:**
- All CRUD success/error for KB, sources, entries, and search operations

**Edge functions** (`knowledge-process`, `knowledge-document-process`, `knowledge-embedding`, `knowledge-semantic-search`):
- Align to `[AI-KNOWLEDGE]` prefix (currently use `[KNOWLEDGE-PROCESS]`, `[KNOWLEDGE-DOC]`, or no prefix)

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `knowledge_entries` (module: `ai-knowledge`)
- `knowledge_sources` (module: `ai-knowledge`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useKnowledgeBase.ts` | Add 6 kernel events + `[AI-KNOWLEDGE]` logging on all CRUD ops (KB, source, entry, search) |
| `supabase/functions/knowledge-process/index.ts` | Rename prefix `[KNOWLEDGE-PROCESS]` → `[AI-KNOWLEDGE]` |
| `supabase/functions/knowledge-document-process/index.ts` | Rename prefix `[KNOWLEDGE-DOC]` → `[AI-KNOWLEDGE]`; add evidence on success (faqs count, topics count, chars processed) |
| `supabase/functions/knowledge-embedding/index.ts` | Add `[AI-KNOWLEDGE]` prefix to all logs |
| `supabase/functions/knowledge-semantic-search/index.ts` | Add `[AI-KNOWLEDGE]` prefix to all logs |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `knowledge_entries` + `knowledge_sources` checks |

