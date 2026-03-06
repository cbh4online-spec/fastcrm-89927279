

# Mkt-Bio-OS — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Page CRUD | `useBioPages.ts` | None | Toast only |
| Block CRUD | `useBioBlocks.ts` | None | Toast only |
| Publish/Unpublish | `useBioPages.ts` → `usePublishBioPage` | None | Toast only |
| Public Render | `PublicBioPage.tsx` | None | None |
| Click Tracking | `PublicBioPage.tsx` → `trackBlockClick` | None (writes to `bio_events`) | None |
| Page View | `PublicBioPage.tsx` → `trackPageView` | None (writes to `bio_events`) | None |
| Form/Lead Submit | `PublicBioPage.tsx` → `FormBlock` | None | Silent catch |
| AI Builder | `bio-ai-builder` edge fn | None | Bare `console.error` |
| Smart Link | `bio-smart-link` edge fn | None | Bare `console.error` |
| SEO Copy | `bio-seo-copy` edge fn | None | Bare `console.error` |
| Image Gen | `bio-generate-image` edge fn | None | Bare `console.error` |
| WhatsApp Copy | `bio-whatsapp-copy` edge fn | None | Bare `console.error` |
| Analytics | `BioAnalyticsTab.tsx` | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | No bio table checks |

Zero kernel events. Zero structured logging.

## Implementation Plan

### A) Kernel Events — Page Lifecycle (`useBioPages.ts`)

Import `emitKernelEvent` + `useWorkspace`. Source: `mkt-bio-os`, entity_kind: `bio_page`.

1. `useCreateBioPage.onSuccess` → emit `BIO.PAGE_CREATED` (payload: `slug`, `name`)
2. `usePublishBioPage.onSuccess` → if status=`live`, emit `BIO.PAGE_PUBLISHED`; if `draft`, log only
3. `useDeleteBioPage.onSuccess` → `console.log('[BIO] Page deleted')`
4. All `onError` → `console.warn('[BIO] <ACTION>_FAILED')`

### B) Kernel Events — Lead Created (`PublicBioPage.tsx`)

In `FormBlock.handleSubmit`, after successful contact insert:

1. Fire-and-forget call to `emitKernelEvent` is not possible here (public page, no workspace context hook). Instead, add structured logging: `console.log('[BIO] Lead captured: page=${page.id}, block=${block.id}')`
2. The `bio_events` insert with `event_type: 'lead'` already creates the audit trail. No kernel event needed from public context.

### C) Logging — Public Page Rendering (`PublicBioPage.tsx`)

1. After page loaded successfully → `console.log('[BIO] Public page rendered: page=${page.id}, blocks=${blocks.length}')`
2. On not found → `console.warn('[BIO] Public page not found: ws=${workspaceSlug}, slug=${pageSlug}')`
3. `trackBlockClick` → `console.log('[BIO] Click tracked: block=${blockId}')`
4. `FormBlock` catch → `console.warn('[BIO] LEAD_CAPTURE_FAILED')`
5. `FormBlock` success → `console.log('[BIO] Lead captured: page=${page.id}')`

### D) Logging — Hooks (`useBioPages.ts`, `useBioBlocks.ts`)

**`useBioPages.ts`:**
1. Create success → `console.log('[BIO] Page created: ${data.slug}')`
2. Update success → `console.log('[BIO] Page updated: ${d.id}')`
3. Delete success → `console.log('[BIO] Page deleted')`
4. Publish success → `console.log('[BIO] Page ${status}: ${d.id}')`
5. All errors → `console.warn('[BIO] <OP>_FAILED', e.message)`

**`useBioBlocks.ts`:**
6. Create error → `console.warn('[BIO] BLOCK_CREATE_FAILED')`
7. Update error → `console.warn('[BIO] BLOCK_UPDATE_FAILED')`
8. Delete error → `console.warn('[BIO] BLOCK_DELETE_FAILED')`
9. Reorder error → `console.warn('[BIO] BLOCK_REORDER_FAILED')`

### E) Logging — Edge Functions

All 5 bio edge functions get `[BIO]` prefix:

**`bio-ai-builder/index.ts`:**
1. Before AI call → `console.log('[BIO] AI builder: vertical=${vertical}, tone=${tone}')`
2. After success → `console.log('[BIO] AI builder: ${blocks.length} blocks generated')`
3. Errors → prefix with `[BIO]`

**`bio-smart-link/index.ts`:**
4. After meta fetch → `console.log('[BIO] Smart link: url=${url}, title=${meta.title}')`
5. Errors → prefix with `[BIO]`

**`bio-seo-copy/index.ts`:**
6. Before AI call → `console.log('[BIO] SEO copy: page=${pageName}')`
7. Errors → prefix with `[BIO]`

**`bio-generate-image/index.ts`:**
8. After upload → `console.log('[BIO] Image generated: ${filePath}')`
9. Errors → prefix with `[BIO]`

**`bio-whatsapp-copy/index.ts`:**
10. Before AI call → `console.log('[BIO] WhatsApp copy: page=${pageName}')`
11. Errors → prefix with `[BIO]`

### F) Smoke Tests

Add to `system-run-smoke-tests`:
- `bio_pages` (module: `mkt-bio-os`)
- `bio_blocks` (module: `mkt-bio-os`)
- `bio_events` (module: `mkt-bio-os`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useBioPages.ts` | Import `emitKernelEvent`; emit `BIO.PAGE_CREATED`, `BIO.PAGE_PUBLISHED`; add `[BIO]` logging |
| `src/hooks/useBioBlocks.ts` | Add `[BIO]` error logging |
| `src/pages/PublicBioPage.tsx` | Add `[BIO]` logging for render, clicks, lead capture |
| `supabase/functions/bio-ai-builder/index.ts` | Add `[BIO]` prefixed logging |
| `supabase/functions/bio-smart-link/index.ts` | Add `[BIO]` prefixed logging |
| `supabase/functions/bio-seo-copy/index.ts` | Add `[BIO]` prefixed logging |
| `supabase/functions/bio-generate-image/index.ts` | Add `[BIO]` prefixed logging |
| `supabase/functions/bio-whatsapp-copy/index.ts` | Add `[BIO]` prefixed logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `bio_pages`, `bio_blocks`, `bio_events` checks |

