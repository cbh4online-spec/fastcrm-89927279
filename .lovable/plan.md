

# System Health & Diagnostics — Implementation Plan

## Overview

Create a dedicated `/dashboard/system/health` page that shows per-module health status, edge function performance, smoke test results, and a request correlation system. This is a new observability layer on top of the existing Kernel infrastructure.

## 1. Database Migration (4 tables)

**`system_function_runs`** — Log every edge function invocation:
- `id`, `workspace_id`, `function_name`, `module_id`, `request_id` (correlation), `status` (success/error), `latency_ms`, `error_message`, `created_at`
- RLS: workspace members can read

**`system_smoke_test_runs`** — Batch test execution records:
- `id`, `workspace_id`, `started_at`, `finished_at`, `total_checks`, `passed`, `failed`, `status` (running/completed/failed)
- RLS: workspace members can read

**`system_smoke_test_failures`** — Individual failed checks:
- `id`, `run_id` (FK to smoke_test_runs), `workspace_id`, `module_id`, `check_name`, `error_message`, `created_at`
- RLS: workspace members can read

**`feature_registry_runtime`** — Runtime health per feature/module:
- `id`, `workspace_id`, `module_id`, `status` (ok/degraded/down), `last_error`, `failures_24h`, `failures_7d`, `success_rate`, `p95_latency_ms`, `smoke_status` (pass/fail/pending), `computed_at`
- RLS: workspace members can read

## 2. Edge Functions (3 new)

### `system-log-function-run`
- Input: `{ workspace_id, function_name, module_id, request_id, status, latency_ms, error? }`
- Inserts into `system_function_runs`
- Lightweight, fire-and-forget (called by other edge functions)

### `system-run-smoke-tests`
- Creates a `system_smoke_test_runs` row
- Runs minimal health checks per module:
  - CRM: query `leads` count
  - Inbox: query `conversations` count  
  - Store: query `store_products` count
  - Kernel: query `kernel_events` count
  - AI: invoke `ai-copilot` with a ping payload
- Logs failures to `system_smoke_test_failures`
- Updates run status

### `system-module-health`
- Aggregates `system_function_runs` (24h + 7d failure counts, success rate, p95 latency)
- Merges latest `system_smoke_test_failures` status
- Computes module status: OK (>95% success, smoke pass), Degraded (>80%), Down (<80% or smoke fail)
- Upserts into `feature_registry_runtime`

## 3. Frontend

### Helper: `src/lib/requestId.ts`
- `generateRequestId()` — returns a UUID v4 stored in a short-lived context
- Used by UI actions and passed to edge function calls

### Hook: `src/hooks/useSystemHealth.ts`
- Query `feature_registry_runtime` for workspace
- Query latest `system_smoke_test_runs`
- Trigger smoke tests + recompute health

### Hook: `src/hooks/useSystemFunctionRuns.ts`
- Query `system_function_runs` with filters (module, status, date range)
- Stats aggregation (success rate, p95)

### Page: `src/pages/SystemHealthPage.tsx`
- **Header**: Workspace health score badge + "Run Smoke Tests" + "Recompute Health" buttons
- **Module Grid**: Cards per module showing status (OK/Degraded/Down color), last error, 24h/7d failures, success rate, p95 latency, smoke status
- **Function Runs Table**: Filterable table of recent edge function runs with request_id, status, latency, error
- **Smoke Test History**: Latest runs with pass/fail summary and expandable failure details

### Route: Add to `src/App.tsx`
- `<Route path="/dashboard/system/health" element={<SystemHealthPage />} />`
- Lazy import of `SystemHealthPage`

### Sidebar: Add "System Health" link under Admin section

## 4. Correlation ID Wiring

### `src/lib/kernelEmitter.ts`
- Update `emitKernelEvent` to accept optional `request_id` and include in payload

### Edge function pattern
- Each edge function that calls `system-log-function-run` extracts `request_id` from input body and passes it through
- V1: wire into `kernel-ingest-event`, `kernel-process-events`, `kernel-compute-decisions` as examples

## File Plan

| File | Action |
|---|---|
| Migration SQL | 4 new tables |
| `supabase/functions/system-log-function-run/index.ts` | New |
| `supabase/functions/system-run-smoke-tests/index.ts` | New |
| `supabase/functions/system-module-health/index.ts` | New |
| `src/lib/requestId.ts` | New — request ID generator |
| `src/hooks/useSystemHealth.ts` | New |
| `src/hooks/useSystemFunctionRuns.ts` | New |
| `src/pages/SystemHealthPage.tsx` | New — full diagnostics page |
| `src/App.tsx` | Add route + lazy import |
| `src/lib/kernelEmitter.ts` | Add request_id support |
| `src/types/featureRegistry.ts` | Add System Health module entry |

