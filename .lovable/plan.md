

# MKT Landing Pages — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Landing CRUD | Works | `useLandingPages.ts`: create/update/delete/publish. Zero kernel events |
| Publish | Works | `usePublishLandingPage` toggles `is_published`. No kernel event, no logging |
| Update | Works | `useUpdateLandingPage` generic update. No kernel event, no logging |
| Delete | Works | No kernel event, no logging |
| Kernel Events | **None** | Zero `LANDING.*` events in codebase |
| Smoke Tests | **None** | No `landing_pages` table check in smoke tests |
| Observability | **None** | No structured logging for landing page lifecycle |

## Implementation Plan

### A) Kernel Events — Wire Landing Page Lifecycle

**`src/hooks/useLandingPages.ts`:**

1. **`useCreateLandingPage.onSuccess`** — Emit `LANDING.CREATED` with `landing_id`, `title`, `slug`.
2. **`useUpdateLandingPage.onSuccess`** — Emit `LANDING.UPDATED` with `landing_id`, `changed_fields`.
3. **`usePublishLandingPage.onSuccess`** — Emit `LANDING.PUBLISHED` (when published) or `LANDING.UNPUBLISHED` (when unpublished) with `landing_id`, `slug`.
4. **`useDeleteLandingPage.onSuccess`** — Emit `LANDING.DELETED` with `landing_id`.

All events use `source_module: 'mkt-landing-pages'`.

### B) Observability — Structured Logging

All mutations in `useLandingPages.ts`:
- `console.log('[LANDING] CREATED id=X slug=Y')`, `[LANDING] PUBLISHED`, etc.
- `console.warn('[LANDING] CREATE_FAILED error=X')` on errors.

### C) Smoke Test

Add to `system-run-smoke-tests`:
- `mkt-landing-pages`: query `landing_pages` table count for workspace.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useLandingPages.ts` | Import `emitKernelEvent` + `useWorkspace`; emit `LANDING.CREATED`, `LANDING.UPDATED`, `LANDING.PUBLISHED`/`UNPUBLISHED`, `LANDING.DELETED`; add structured logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `landing_pages` table check under `mkt-landing-pages` module |

