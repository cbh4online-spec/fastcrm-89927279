

# Core Productivity — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Task CRUD | Works | `useTasks.ts`: create/update/delete/toggle. Zero kernel events |
| Assignment | Partial | `assigned_to` field exists, no event on assignment change |
| Toggle Status | Works | `useToggleTaskStatus` flips pending↔done. No kernel event |
| Update | Works | `useUpdateTask` generic update. No kernel event, no assignment detection |
| Kernel Events | **None** | Zero `TASK.*` events in codebase |
| Smoke Tests | **None** | No `tasks` table check in smoke tests |
| Observability | **None** | No structured logging for task transitions |

## Implementation Plan

### A) Kernel Events — Wire Task Lifecycle

**1. `useCreateTask.onSuccess`** — Emit `TASK.CREATED` with `task_id`, `title`, `related_type`, `related_id`, `assigned_to`, `due_at`.

**2. `useUpdateTask.onSuccess`** — Emit `TASK.UPDATED` with `task_id`, `changed_fields`. Additionally, if `assigned_to` changed (present in update payload), also emit `TASK.ASSIGNED` with `task_id`, `assigned_to`.

**3. `useToggleTaskStatus.onSuccess`** — Emit `TASK.COMPLETED` (when new status is `done`) or `TASK.REOPENED` (when toggled back to `pending`), with `task_id`, `previous_status`, `new_status`.

All events use `emitKernelEvent` with `source_module: 'core-productivity'`.

### B) Observability — Structured Logging

In each mutation's `onSuccess`/`onError`:
- `console.log('[TASK] CREATED id=X title=Y')`, `[TASK] COMPLETED`, `[TASK] ASSIGNED`
- `console.warn('[TASK] CREATE_FAILED error=X')` on errors

### C) Smoke Test

Add to `system-run-smoke-tests`:
- `core-productivity`: query `tasks` table count for workspace.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useTasks.ts` | Import `emitKernelEvent`; emit `TASK.CREATED` in create, `TASK.UPDATED`+`TASK.ASSIGNED` in update, `TASK.COMPLETED`/`TASK.REOPENED` in toggle; add structured logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `tasks` table check |

