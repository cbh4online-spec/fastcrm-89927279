

# Admin Integrations — Kernel V2 Stabilization

## Current State

| Integration | Hook | Mutations | Kernel Events | Logging |
|---|---|---|---|---|
| Stripe | `useWorkspaceStripeConfig.ts` | saveConfig, testConnection | None | None |
| GHL | `useWorkspaceGHLConfig.ts` | saveConfig, testConnection | None | 1 `console.error` |
| WhatsApp | `useWhatsAppConnection.ts` | disconnect | None | None |
| Instagram | `useInstagramConnection.ts` | disconnect | None | None |
| Email | `useEmailConnection.ts` | connect, update, disconnect, sync, forceResync, send | None | `console.error` only |
| Smoke Tests | — | — | — | No integration config tables checked |

## Implementation Plan

### A) Kernel Events — Per Hook

**`useWorkspaceStripeConfig.ts`**
1. `saveConfig.onSuccess` → `INTEGRATION.CONFIGURED` (entity_kind: `stripe`, payload: `is_active`, `test_mode`)
2. `saveConfig.onError` → `console.warn('[INTEGRATIONS] STRIPE_CONFIG_FAILED')`
3. `testConnection.onSuccess` (success=true) → `INTEGRATION.CONNECTED` (entity_kind: `stripe`)
4. `testConnection.onSuccess` (success=false) → `INTEGRATION.FAILED` (entity_kind: `stripe`, payload: `error`)
5. `testConnection.onError` → `INTEGRATION.FAILED`

**`useWorkspaceGHLConfig.ts`**
1. `saveConfigMutation.onSuccess` → `INTEGRATION.CONFIGURED` (entity_kind: `ghl`, payload: `is_active`, `sync_contacts`, `sync_messages`)
2. `saveConfigMutation.onError` → warn log
3. `testConnectionMutation.onSuccess` → `INTEGRATION.CONNECTED` (entity_kind: `ghl`)
4. `testConnectionMutation.onError` → `INTEGRATION.FAILED`

**`useWhatsAppConnection.ts`** (needs `emitKernelEvent` + `useWorkspace` import — already has `useWorkspace`)
1. `useDisconnectWhatsApp.onSuccess` → `INTEGRATION.DISCONNECTED` (entity_kind: `whatsapp`)

**`useInstagramConnection.ts`** (same pattern)
1. `useDisconnectInstagram.onSuccess` → `INTEGRATION.DISCONNECTED` (entity_kind: `instagram`)

**`useEmailConnection.ts`** (needs `emitKernelEvent` import)
1. `useConnectEmail.onSuccess` → `INTEGRATION.CONNECTED` (entity_kind: `email`, payload: `provider`)
2. `useConnectEmail.onError` → `INTEGRATION.FAILED`
3. `useDisconnectEmail.onSuccess` → `INTEGRATION.DISCONNECTED`
4. `useSyncEmail.onSuccess` → `INTEGRATION.SYNCED` (entity_kind: `email`)
5. `useSyncEmail.onError` → `INTEGRATION.FAILED`

All events: `source_module: 'admin-integrations'`.

### B) Observability — Structured Logging

All hooks get `[INTEGRATIONS]` prefixed `console.log` on success, `console.warn` on error for every mutation.

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `workspace_stripe_config` table check
- `workspace_ghl_config` table check
- `whatsapp_connections` table check
- `instagram_connections` table check
- `email_connections` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useWorkspaceStripeConfig.ts` | Import `emitKernelEvent`; emit `INTEGRATION.CONFIGURED`/`CONNECTED`/`FAILED`; add `[INTEGRATIONS]` logging |
| `src/hooks/useWorkspaceGHLConfig.ts` | Import `emitKernelEvent`; emit `INTEGRATION.CONFIGURED`/`CONNECTED`/`FAILED`; add logging |
| `src/hooks/useWhatsAppConnection.ts` | Import `emitKernelEvent`; emit `INTEGRATION.DISCONNECTED` on disconnect; add logging |
| `src/hooks/useInstagramConnection.ts` | Import `emitKernelEvent`; emit `INTEGRATION.DISCONNECTED` on disconnect; add logging |
| `src/hooks/useEmailConnection.ts` | Import `emitKernelEvent`; emit `INTEGRATION.CONNECTED`/`DISCONNECTED`/`SYNCED`/`FAILED`; add logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 5 integration config table checks |

