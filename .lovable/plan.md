

# Admin Settings — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Admin Settings CRUD | Works | `useAdminSettings.ts`: upsert/delete. Zero kernel events, no structured logging |
| Workspace Settings | Works | `useWorkspaceSettings.ts`: updateInfo/updateBranding/uploadLogo. Zero kernel events, no structured logging |
| Store Settings | Works | `useStoreSettings.ts` + `useUpsertStoreSettings`. Zero kernel events, no structured logging |
| Client Notification Settings | Works | `useNotificationSettings.ts`: upsert prefs. Zero kernel events, no structured logging |
| Smoke Tests | **None** | No `admin_settings`, `store_settings`, `client_notification_settings` checks |
| Observability | **None** | No structured logging in any settings hooks |

## Implementation Plan

### A) Kernel Events — `src/hooks/useAdminSettings.ts`

1. **`upsertSetting.onSuccess`** → Emit `SETTINGS.UPDATED` with `setting_key`, `action` (create/update)
2. **`upsertSetting.onError`** → `console.warn('[ADMIN-SETTINGS] UPDATE_FAILED')`
3. **`deleteSetting.onSuccess`** → Emit `SETTINGS.DELETED` with `setting_key`
4. **`deleteSetting.onError`** → `console.warn('[ADMIN-SETTINGS] DELETE_FAILED')`

Note: `useAdminSettings` is global (no workspace context). Events will omit `workspace_id` or use a sentinel value.

### B) Kernel Events — `src/hooks/useWorkspaceSettings.ts`

1. **`updateWorkspaceInfo` success** → Emit `SETTINGS.WORKSPACE_UPDATED` with `changed_fields: ['name','slug']`
2. **`updateBranding` success** → Emit `SETTINGS.BRANDING_UPDATED`
3. **`uploadLogo` success** → Emit `SETTINGS.LOGO_UPLOADED`
4. All errors → `console.warn('[WS-SETTINGS] ..._FAILED')`

All events: `source_module: 'admin-settings'`, workspace from `currentWorkspace.id`.

### C) Kernel Events — `src/hooks/useStoreSettings.ts`

1. **`useUpsertStoreSettings.onSuccess`** → Emit `SETTINGS.STORE_UPDATED`
2. **`useUpsertStoreSettings.onError`** → `console.warn('[STORE-SETTINGS] UPDATE_FAILED')`

### D) Kernel Events — `src/hooks/client-portal/useNotificationSettings.ts`

1. **`upsertSettings.onSuccess`** → Emit `SETTINGS.NOTIFICATIONS_UPDATED` with `company_id`
2. **`upsertSettings.onError`** → `console.warn('[NOTIF-SETTINGS] UPDATE_FAILED')`

### E) Observability

All hooks: `[ADMIN-SETTINGS]`, `[WS-SETTINGS]`, `[STORE-SETTINGS]`, `[NOTIF-SETTINGS]` prefixed logging on success/error.

### F) Smoke Tests

Add to `system-run-smoke-tests`:
- `admin_settings` table check (no workspace filter — use a generic check or skip workspace_id filter)
- `store_settings` table check
- `client_notification_settings` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useAdminSettings.ts` | Import `emitKernelEvent`; emit `SETTINGS.UPDATED`/`SETTINGS.DELETED`; add logging |
| `src/hooks/useWorkspaceSettings.ts` | Import `emitKernelEvent` + use `currentWorkspace`; emit `SETTINGS.WORKSPACE_UPDATED`/`BRANDING_UPDATED`/`LOGO_UPLOADED`; add logging |
| `src/hooks/useStoreSettings.ts` | Import `emitKernelEvent` + use `currentWorkspace`; emit `SETTINGS.STORE_UPDATED`; add logging |
| `src/hooks/client-portal/useNotificationSettings.ts` | Import `emitKernelEvent`; emit `SETTINGS.NOTIFICATIONS_UPDATED`; add logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `admin_settings`, `store_settings`, `client_notification_settings` checks |

