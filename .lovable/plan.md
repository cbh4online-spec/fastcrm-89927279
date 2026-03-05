

# Comm-Templates — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Templates CRUD | Works | Two systems: `useCommunicationTemplates.ts` (main) + `useTemplates.ts` (with versioning via `template_versions`). No kernel events on either |
| Versioning | Partial | `useTemplates.ts` has `template_versions` table + `useUpdateTemplate` with `createVersion` flag. `useCommunicationTemplates.ts` has no versioning |
| AI Generation | Works | `useGenerateTemplate` → `generate-template` edge function. No structured logging of generation calls |
| Predictive | Works | `usePredictiveTemplates.ts` has variants, stats, predictive copy. No kernel events |
| Kernel Events | **None** | Zero `TEMPLATE.*` events in codebase |
| Smoke Tests | **None** | No `communication_templates` check |

## Implementation Plan

### A) Kernel Events — Wire Template Lifecycle

**1. `useCreateCommunicationTemplate.onSuccess`** — Emit `TEMPLATE.CREATED` with `template_id`, `channel`, `name`, `tone`.

**2. `useUpdateCommunicationTemplate.onSuccess`** — Emit `TEMPLATE.UPDATED` with `template_id`, `changed_fields` (keys of update payload).

**3. `useUpdateCommunicationTemplate` — when `isActive` changes** — Also emit `TEMPLATE.PUBLISHED` (when toggled to active) with `template_id`, `channel`.

**4. `useGenerateTemplate.onSuccess`** — Emit `TEMPLATE.CREATED` with `source: 'ai_generation'`, `type`, `tone`.

All events use `emitKernelEvent` with `source_module: 'comm-templates'`.

### B) Observability — AI Generation Logging

In `useGenerateTemplate`:
- `console.log('[COMM-TEMPLATE] AI_GENERATED type=X tone=Y')` on success
- `console.warn('[COMM-TEMPLATE] AI_GENERATION_FAILED error=X')` on error

In `useCreateCommunicationTemplate` and `useUpdateCommunicationTemplate`:
- `console.log('[COMM-TEMPLATE] CREATED id=X channel=Y')` / `UPDATED` on success

### C) Smoke Test

Add `comm-templates` check to `system-run-smoke-tests`:
- `communication_templates_query`: count `communication_templates` for workspace
- `template_usage_logs_query`: count `template_usage_logs` for workspace

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useCommunicationTemplates.ts` | Import `emitKernelEvent`; emit `TEMPLATE.CREATED` in create, `TEMPLATE.UPDATED` + `TEMPLATE.PUBLISHED` in update; add structured logging |
| `src/hooks/useGenerateTemplate.ts` | Import `emitKernelEvent`; emit `TEMPLATE.CREATED` with `source: 'ai_generation'`; add structured logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `communication_templates` and `template_usage_logs` table checks |

