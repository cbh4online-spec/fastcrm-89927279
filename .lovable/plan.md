

# Core Forms — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Create Form | `useSmartForms.ts` | `useCreateSmartForm` | None | `console.error` only |
| Update Form | `useSmartForms.ts` | `useUpdateSmartForm` | None | `console.error` only |
| Delete Form | `useSmartForms.ts` | `useDeleteSmartForm` | None | `console.error` only |
| Submit Form (hook) | `useSmartForms.ts` | `useSubmitForm` | None | `console.error` only |
| Submit Form (edge fn) | `process-form-submission/index.ts` | insert submission + lead/contact/opportunity | None | 1 `console.error` |
| Public Form Page | `PublicFormPage.tsx` | calls edge fn directly | None | `console.error` only |
| Smoke Tests | — | — | — | No `forms` or `form_submissions` checks |

## Implementation Plan

### A) Kernel Events — `src/hooks/useSmartForms.ts`

Import `emitKernelEvent` + `useWorkspace`. All events use `source_module: 'core-forms'`.

1. `useCreateSmartForm.onSuccess` → `FORM.CREATED` (entity_kind: `form`, payload: `name`, `form_type`, `is_conversational`)
2. `useUpdateSmartForm.onSuccess` → `FORM.UPDATED` (payload: `name`, `is_active`)
3. `useDeleteSmartForm.onSuccess` → `FORM.DELETED`
4. `useSubmitForm.onSuccess` → `FORM.SUBMITTED` (payload: `score`, `temperature`, `leadId`)
5. All errors → `console.warn('[FORMS] ..._FAILED')`

### B) Kernel Events — `supabase/functions/process-form-submission/index.ts`

Add `[FORMS]` structured logging throughout:
1. Log incoming request params: `[FORMS] Processing submission for form: ${formId}`
2. Log scoring result: `[FORMS] Score: ${score}, Temperature: ${temperature}`
3. Log lead creation: `[FORMS] Lead created: ${leadId}` → also emit `LEAD.CREATED_FROM_FORM` via kernel-ingest-event edge fn call
4. Log contact creation: `[FORMS] Contact created: ${contactId}`
5. Log opportunity creation: `[FORMS] Opportunity created: ${opportunityId}`
6. Log completion: `[FORMS] Submission ${submission.id} processed successfully`
7. Log errors: `[FORMS] SUBMISSION_FAILED: ${error}`

For the `LEAD.CREATED_FROM_FORM` kernel event, call the `kernel-ingest-event` edge function server-side using fetch (since we're already in an edge function).

### C) Observability — All Client Hooks

All hooks get `[FORMS]` prefixed `console.log` on success, `console.warn` on error.

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `forms` table check
- `form_submissions` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useSmartForms.ts` | Import `emitKernelEvent`; emit `FORM.CREATED`/`UPDATED`/`DELETED`/`SUBMITTED`; add `[FORMS]` logging |
| `supabase/functions/process-form-submission/index.ts` | Add `[FORMS]` structured logging; emit `LEAD.CREATED_FROM_FORM` server-side via kernel-ingest-event |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `forms` and `form_submissions` checks |

