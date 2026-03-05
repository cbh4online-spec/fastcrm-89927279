

# Core Dashboard — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Dashboard CRUD | `useReportDashboards.ts` | create/update/delete | None | Toast only |
| Widget CRUD | `useReportWidgets.ts` | create/update/duplicate/delete | None | Toast only |
| Widget Data | `useWidgetData.ts` | fetch + aggregate | None | None |
| AI Insights | `useOperationalDashboard.ts` | invoke `ai-dashboard-insights` | None | `console.error`/`console.warn` |
| Smoke Tests | `system-run-smoke-tests` | — | — | No `report_dashboards`/`report_widgets` checks |

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useReportWidgets.ts`

Import `emitKernelEvent` + `useWorkspace`. All events: `source_module: 'core-dashboard'`, `entity_kind: 'widget'`.

1. `useCreateWidget.onSuccess` → `DASHBOARD.WIDGET_ADDED` (payload: `dashboard_id`, `chart_type`, `dataset`, `metric`, `group_by`, `layout_size`)
2. `useUpdateWidget.onSuccess` → `DASHBOARD.WIDGET_UPDATED`
3. `useDuplicateWidget.onSuccess` → `DASHBOARD.WIDGET_DUPLICATED`
4. `useDeleteWidget.onSuccess` → `DASHBOARD.WIDGET_DELETED`
5. All errors → `console.warn('[DASHBOARD] ..._FAILED')`
6. All successes → `console.log('[DASHBOARD] ...')`

### B) Kernel Events + Logging — `src/hooks/useReportDashboards.ts`

Import `emitKernelEvent`. Events: `source_module: 'core-dashboard'`, `entity_kind: 'dashboard'`.

1. `useCreateDashboard.onSuccess` → `DASHBOARD.CREATED`
2. `useUpdateDashboard.onSuccess` → `DASHBOARD.UPDATED`
3. `useDeleteDashboard.onSuccess` → `DASHBOARD.DELETED`
4. All errors → `console.warn('[DASHBOARD] ..._FAILED')`

### C) Observability — `src/hooks/useWidgetData.ts`

Add `[DASHBOARD]` prefixed logging:
1. Query start: `console.log('[DASHBOARD] Widget data loading: ${widget.id}, dataset: ${widget.dataset}')`
2. Query success with latency: measure `performance.now()` delta, log `[DASHBOARD] Widget data loaded: ${widget.id}, ${rows.length} rows, ${latencyMs}ms`
3. Query error: `console.warn('[DASHBOARD] Widget data LOAD_FAILED: ${widget.id}')`

### D) Kernel Events + Logging — `src/hooks/useOperationalDashboard.ts`

In `useDashboardAIInsights`:
1. On successful AI response → `DASHBOARD.INSIGHT_GENERATED` (entity_kind: `insight`, payload: `insights_count`, `next_actions_count`, `source: 'ai'`)
2. On fallback used → `console.warn('[DASHBOARD] AI insights fallback used')`
3. Existing error logs → prefix with `[DASHBOARD]`

### E) Smoke Tests

Add to `system-run-smoke-tests`:
- `report_dashboards` table check
- `report_widgets` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useReportWidgets.ts` | Import `emitKernelEvent`; emit widget CRUD events; add `[DASHBOARD]` logging |
| `src/hooks/useReportDashboards.ts` | Import `emitKernelEvent`; emit dashboard CRUD events; add `[DASHBOARD]` logging |
| `src/hooks/useWidgetData.ts` | Add `[DASHBOARD]` latency logging for widget data fetches |
| `src/hooks/useOperationalDashboard.ts` | Emit `DASHBOARD.INSIGHT_GENERATED`; prefix logs with `[DASHBOARD]` |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `report_dashboards` and `report_widgets` checks |

