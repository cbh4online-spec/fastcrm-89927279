

# Admin Workspaces — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Create Workspace (context) | `WorkspaceContext.tsx` | `createWorkspace` via RPC | None | 1 `console.error` |
| Create Workspace (super-admin) | `CreateWorkspaceDialog.tsx` | `createWorkspace` via RPC | None | None (uses `log_admin_action`) |
| Invite Member (settings) | `WorkspaceSettings.tsx` | `handleInviteMember` via edge fn | None | 1 `console.error` |
| Add Manual Member (settings) | `WorkspaceSettings.tsx` | `handleAddManualMember` direct insert | None | 1 `console.error` |
| Update Role (settings) | `WorkspaceSettings.tsx` | `handleUpdateMemberRole` direct update | None | 1 `console.error` |
| Remove Member (settings) | `WorkspaceSettings.tsx` | `handleRemoveMember` direct delete | None | 1 `console.error` |
| Add Member (super-admin) | `WorkspaceMembersPanel.tsx` | `addMember` via RPC | None | None (uses `log_admin_action`) |
| Update Role (super-admin) | `WorkspaceMembersPanel.tsx` | `updateRole` via RPC | None | None (uses `log_admin_action`) |
| Remove Member (super-admin) | `WorkspaceMembersPanel.tsx` | `removeMember` via RPC | None | None (uses `log_admin_action`) |
| Smoke Tests | — | — | — | No `workspace_members` check |

## Implementation Plan

### A) Kernel Events — `src/contexts/WorkspaceContext.tsx`

1. **`createWorkspace` success** → Emit `WORKSPACE.CREATED` with `workspace_name`, `slug`
2. **`createWorkspace` error** → `console.warn('[WORKSPACES] CREATE_FAILED')`

Import `emitKernelEvent` + `generateRequestId`.

### B) Kernel Events — `src/components/super-admin/CreateWorkspaceDialog.tsx`

1. **`createWorkspace.onSuccess`** → Emit `WORKSPACE.CREATED` with `name`, `slug`, `plan`, `owner_email`
2. **`createWorkspace.onError`** → `console.warn('[WORKSPACES] ADMIN_CREATE_FAILED')`

### C) Kernel Events — `src/components/settings/sections/WorkspaceSettings.tsx`

1. **`handleInviteMember` success** → Emit `MEMBER.INVITED` with `email`, `role`
2. **`handleAddManualMember` success** → Emit `MEMBER.ADDED` with `user_id`, `role`
3. **`handleUpdateMemberRole` success** → Emit `ROLE.UPDATED` with `member_id`, `new_role`
4. **`handleRemoveMember` success** → Emit `MEMBER.REMOVED` with `member_id`
5. All errors → `console.warn('[WORKSPACES] ..._FAILED')`

### D) Kernel Events — `src/components/super-admin/WorkspaceMembersPanel.tsx`

1. **`addMember.onSuccess`** → Emit `MEMBER.ADDED` with `user_id`, `role`
2. **`updateRole.onSuccess`** → Emit `ROLE.UPDATED` with `user_id`, `new_role`
3. **`removeMember.onSuccess`** → Emit `MEMBER.REMOVED` with `user_id`
4. All errors → `console.warn('[WORKSPACES] ..._FAILED')`

All events: `source_module: 'admin-workspaces'`, `entity_kind: 'workspace'` or `'workspace_member'`.

### E) Observability

All files: `[WORKSPACES]` prefixed `console.log` on success, `console.warn` on error.

### F) Smoke Tests

Add to `system-run-smoke-tests`:
- `workspace_members` table check
- `workspace_invitations` table check (if exists, otherwise skip)

## File Plan

| File | Action |
|------|--------|
| `src/contexts/WorkspaceContext.tsx` | Import `emitKernelEvent`; emit `WORKSPACE.CREATED`; add logging |
| `src/components/super-admin/CreateWorkspaceDialog.tsx` | Import `emitKernelEvent`; emit `WORKSPACE.CREATED`; add logging |
| `src/components/settings/sections/WorkspaceSettings.tsx` | Import `emitKernelEvent`; emit `MEMBER.INVITED`/`ADDED`/`ROLE.UPDATED`/`REMOVED`; add logging |
| `src/components/super-admin/WorkspaceMembersPanel.tsx` | Import `emitKernelEvent`; emit `MEMBER.ADDED`/`ROLE.UPDATED`/`REMOVED`; add logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `workspace_members` check |

