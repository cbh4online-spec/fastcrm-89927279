

# Comm-Email — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Send Email | `useEmailConnection.ts` → `useSendEmail` | invoke `email-send` edge fn | None | `[INTEGRATIONS]` prefix (already) |
| Send Edge Fn | `email-send/index.ts` | SMTP send + save message + activity | None | `console.log/error` (no prefix) |
| Compose UI | `ComposeEmailDialog.tsx` | orchestrates send | None | `console.error` only |
| Sequences | `useEmailSequences.ts` | CRUD sequences/steps/enrollments | None | Toast only |
| Translation | `useEmailTranslation.ts` | invoke `ai-translate-email` | None | `console.error` only |
| Marketing Webhook | `marketing-webhook/index.ts` | process Resend events | None | `console.log` (no prefix) |
| Smoke Tests | `system-run-smoke-tests` | — | `email_connections` under `admin-integrations` | No `comm-email` specific checks |

**Note:** `useEmailConnection.ts` already has kernel events for INTEGRATION.CONNECTED/DISCONNECTED/SYNCED/FAILED under `admin-integrations`. The `comm-email` module scope is the **sending, tracking, and sequencing** layer — distinct from connection management.

## Implementation Plan

### A) Kernel Events + Logging — `useEmailConnection.ts` (useSendEmail only)

The `useSendEmail` hook currently logs `[INTEGRATIONS] EMAIL_SENT` but emits no kernel event.

1. `useSendEmail.onSuccess` → emit `EMAIL.SENT` with `source_module: 'comm-email'`, payload: `to`, `has_subject`, `is_html`, `has_in_reply_to`
2. `useSendEmail.onError` → emit `EMAIL.SEND_FAILED`; keep existing `[INTEGRATIONS]` prefix but add `[EMAIL]` secondary prefix

### B) Kernel Events + Logging — `supabase/functions/email-send/index.ts`

Add `[EMAIL]` prefixed structured logging to the edge function:

1. Before SMTP connect → `console.log('[EMAIL] Sending: to=${to}, subject_len=${subject.length}')`
2. SMTP success → `console.log('[EMAIL] SMTP delivered: messageId=${messageId}')`
3. SMTP error → `console.warn('[EMAIL] SMTP_FAILED: ${error}')`; prefix existing `console.error`
4. Message save error → `console.warn('[EMAIL] MESSAGE_SAVE_FAILED')`; prefix existing
5. Credential decrypt error → `console.warn('[EMAIL] DECRYPT_FAILED')`; prefix existing

### C) Kernel Events + Logging — `useEmailSequences.ts`

Import `emitKernelEvent`. Events: `source_module: 'comm-email'`, `entity_kind: 'email_sequence'`.

1. `useCreateSequence.onSuccess` → `EMAIL.SEQUENCE_CREATED` (payload: `has_exit_conditions`, `tags_count`)
2. `useCreateSequence.onError` → `console.warn('[EMAIL] SEQUENCE_CREATE_FAILED')`
3. `useUpdateSequence.onSuccess` → `console.log('[EMAIL] Sequence updated')`
4. `useUpdateSequence.onError` → `console.warn('[EMAIL] SEQUENCE_UPDATE_FAILED')`
5. `useDeleteSequence.onSuccess` → `console.log('[EMAIL] Sequence deleted')`
6. `useDeleteSequence.onError` → `console.warn('[EMAIL] SEQUENCE_DELETE_FAILED')`
7. `useEnrollContact.onSuccess` → `EMAIL.SEQUENCE_ENROLLED` (payload: `sequence_id`, `contact_id`)
8. `useEnrollContact.onError` → `console.warn('[EMAIL] ENROLL_FAILED')`

### D) Logging — `useEmailTranslation.ts`

Add `[EMAIL]` prefixed logging (no kernel events — utility function):

1. `onError` → `console.warn('[EMAIL] TRANSLATE_FAILED')`; prefix existing `console.error`

### E) Logging — `supabase/functions/marketing-webhook/index.ts`

Add `[EMAIL]` prefixed structured logging:

1. Prefix existing `console.log("Received Resend webhook:...")` → `[EMAIL] Webhook received: ${type}`
2. Recipient not found → `console.warn('[EMAIL] WEBHOOK_RECIPIENT_NOT_FOUND')`
3. Processed event → `console.log('[EMAIL] Webhook processed: ${event} for recipient ${id}')`

### F) Smoke Tests

Add `comm-email` specific checks:
- `conversations` table check (module: `comm-email`)
- `messages` table check (module: `comm-email`)
- `email_sequences` table check (module: `comm-email`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useEmailConnection.ts` | Emit `EMAIL.SENT` in `useSendEmail.onSuccess` |
| `supabase/functions/email-send/index.ts` | Add `[EMAIL]` prefixed logging for SMTP lifecycle |
| `src/hooks/useEmailSequences.ts` | Import `emitKernelEvent`; emit sequence lifecycle events; add `[EMAIL]` logging |
| `src/hooks/useEmailTranslation.ts` | Prefix existing error log with `[EMAIL]` |
| `supabase/functions/marketing-webhook/index.ts` | Prefix all logs with `[EMAIL]` |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `conversations`, `messages`, `email_sequences` checks under `comm-email` |

