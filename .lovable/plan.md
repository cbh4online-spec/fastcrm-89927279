

# B2B Portal — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Auth | Works | `useClientAuth` handles login/session/client_users lookup. No kernel events on login, auth failure, or session expiry |
| Permissions | Works | Filtered by `client_users.status` (active/pending) + workspace_id. No kernel event trail |
| Kernel Events | **None** | Zero `B2B.*` kernel events anywhere in codebase |
| Smoke Tests | **None** | No `client_users` check in smoke tests |
| Observability | Minimal | Console.log only, no structured auth failure logging |

## Implementation Plan

### A) Kernel Events — `B2B.LOGIN` and Auth Failure Logging

**1. `useClientAuth.ts` — `signIn` method**: After successful `signInWithPassword` + `fetchClientUser`, emit `B2B.LOGIN` kernel event with `client_user_id`, `workspace_id`, `email`. On auth failure (invalid credentials or `hasAuthButNoClient`), log structured `[B2B-AUTH] FAILURE email=X reason=Y` to console.

**2. `ClientLoginPage.tsx` — Auth failure event**: When `hasAuthButNoClient` is rendered (authenticated but no client_users record), emit `B2B.ACCESS_DENIED` kernel event with `auth_user_id`, `reason: 'no_client_record'`.

### B) Session Expiry — `B2B.SESSION_EXPIRED`

In `useClientAuth.ts`, within `onAuthStateChange`, when event is `SIGNED_OUT` or `TOKEN_REFRESHED` fails and we had a previous `clientUser`, emit `B2B.SESSION_EXPIRED` with `client_user_id`, `workspace_id`.

### C) Observability — Structured Auth Logging

In `useClientAuth.ts`:
- On `signIn` error: `console.warn('[B2B-AUTH] LOGIN_FAILED', { email, error })`
- On successful login: `console.log('[B2B-AUTH] LOGIN_OK', { email, client_user_id })`
- On `hasAuthButNoClient`: already logged, add structured prefix

### D) Smoke Test

Add `b2b-client-users` check to `system-run-smoke-tests`: `runCheck(supabase, workspace_id, "b2b-portal", "client_users_query", "client_users")`.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/client-portal/useClientAuth.ts` | Emit `B2B.LOGIN` on successful sign-in, `B2B.SESSION_EXPIRED` on sign-out with prior session, structured logging |
| `src/pages/client/ClientLoginPage.tsx` | Emit `B2B.ACCESS_DENIED` when `hasAuthButNoClient` rendered |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `b2b-portal` client_users check |

