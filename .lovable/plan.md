

# Phase 5 — Dependency Linking + Change Detection + Job Runner + Alert Policy + Telemetry

## Current State

**Already exists (Phase 4):**
- `context_dependencies` table (relation, strength, rule_json) + CRUD hook + UI tab
- `context_drift` table + `compute-drift` edge function (score formula working)
- `context_alerts` table + alerts panel with mark-read/resolve
- `context_event_log` + event bus (mitt + persist)
- `context_block_versions` table (block_id, version_number, snapshot_fields, change_summary)
- Action Registry (15 actions) + ActionCommandPalette (⌘K)
- `context_block_status` enum: `draft` | `approved`

**Missing (this PRD):**
1. Dependencies: `auto_detected`, `created_by`, more `relation_type` options, loop prevention
2. Change Detection: `change_type` + `changed_fields` columns on versions
3. Job Runner: `jobs` table + `process-jobs` edge function + cron
4. Alert Policy: `alert_policy` table + `snooze_until`/`last_shown_at` on alerts + cooldown logic
5. System Metrics: `system_metrics_daily` table + `compute-metrics` edge function
6. System Health Score: computed from drift data
7. Alerts page at `/alerts`
8. Command Center dashboard enhancements (drift overview, health score)

## Database Migration

### New tables

1. **`jobs`** — async job queue
   - `id, workspace_id, type, payload_json, status (pending/running/completed/failed/retry), attempts, max_attempts, run_after, last_error, created_at, updated_at`

2. **`alert_policy`** — per-workspace alert governance
   - `workspace_id (PK), max_warn_per_day, max_risk_per_day, cooldown_hours`

3. **`system_metrics_daily`** — daily telemetry
   - `id, workspace_id, metric_date, commands_executed, alerts_generated, alerts_resolved, tasks_created_system, tasks_completed, drift_blocks_warn, drift_blocks_risk, drift_blocks_critical, health_score, created_at`
   - Unique on `(workspace_id, metric_date)`

### ALTER existing tables

4. **`context_block_versions`** — add `change_type TEXT DEFAULT 'minor'`, `changed_fields TEXT[]`

5. **`context_dependencies`** — add `auto_detected BOOLEAN DEFAULT false`, `created_by UUID`

6. **`context_alerts`** — add `snooze_until TIMESTAMPTZ`, `last_shown_at TIMESTAMPTZ`
   - Update status check constraint to include `'snoozed'`

### Constraints

7. **`context_dependencies`** — CHECK `source_block_id != target_block_id`

All tables get RLS scoped by workspace membership.

## Edge Functions

### `process-jobs` (new)
- Fetches up to 20 pending jobs where `run_after <= now()`
- Sets status to `running`, executes handler based on `type`:
  - `compute_drift` → calls compute-drift logic inline
  - `compute_impact` → calls compute-impact logic inline
  - `compute_metrics` → aggregates daily metrics
  - `cleanup_alerts` → resolves old alerts (>30 days)
  - `create_tasks_from_drift` → creates tasks for risk/critical blocks
- On success: `status = completed`; on error: `attempts++`, retry if < max_attempts

### `compute-metrics` (new)
- Counts from `context_event_log` (commands_executed), `context_alerts`, `tasks`, `context_drift`
- Computes health_score = 100 - (critical*5) - (risk*2) - (overdue_tasks*1), clamped 0-100
- Upserts into `system_metrics_daily`

### Cron setup
- SQL (via insert tool, not migration) to schedule:
  - `process-jobs` every 5 minutes
  - `compute-drift` every 6 hours
  - `compute-metrics` daily

## Frontend Changes

### Hooks
1. **`useJobs`** — query/create jobs
2. **`useAlertPolicy`** — fetch/update workspace alert policy
3. **`useSystemMetrics`** — fetch daily metrics + health score
4. **`useContextAlerts`** — extend with snooze mutation, respect cooldown/snooze_until filtering

### Components
1. **`SystemHealthBadge`** — displays health score (excellent/stable/attention/critical) with color
2. **`AlertPolicySettings`** — form to configure max alerts per day, cooldown
3. **`SystemMetricsPanel`** — charts showing commands, alerts, tasks, drift over time
4. **`AlertsPage`** — dedicated `/dashboard/alerts` page with full inbox (filter by status including snoozed)

### Updates to existing
1. **`ContextOSDashboard`** — add SystemHealthBadge in header, drift overview summary (OK/WARN/RISK/CRITICAL counts)
2. **`ContextDependenciesTab`** — add relation types `depends_on`, `references`; show `auto_detected` badge
3. **`useContextVersions`** — pass `change_type` and `changed_fields` when creating versions
4. **`actionRegistry`** — add actions: `jobs.process`, `metrics.compute`, `alerts.cleanup`
5. **Routing** — add `/dashboard/alerts` route

## File Plan

| File | Action |
|------|--------|
| Migration SQL | New tables (jobs, alert_policy, system_metrics_daily) + ALTER versions/deps/alerts |
| `supabase/functions/process-jobs/index.ts` | Job runner edge function |
| `supabase/functions/compute-metrics/index.ts` | Daily metrics computation |
| `src/hooks/useJobs.ts` | Jobs CRUD hook |
| `src/hooks/useAlertPolicy.ts` | Alert policy hook |
| `src/hooks/useSystemMetrics.ts` | Metrics + health score hook |
| `src/hooks/useContextAlerts.ts` | Extend with snooze |
| `src/components/context-os/SystemHealthBadge.tsx` | Health score badge |
| `src/components/context-os/SystemMetricsPanel.tsx` | Telemetry charts |
| `src/components/context-os/AlertPolicySettings.tsx` | Policy config form |
| `src/pages/AlertsPage.tsx` | Dedicated alerts inbox |
| `src/components/context-os/ContextOSDashboard.tsx` | Add health + drift overview |
| `src/components/context-os/ContextDependenciesTab.tsx` | Extended relation types |
| `src/lib/actionRegistry.ts` | New actions |
| `src/App.tsx` | Add alerts route |

## Implementation Order

1. Database migration (all schema changes)
2. Edge functions (process-jobs, compute-metrics)
3. Hooks (jobs, alert policy, metrics, alerts extension)
4. UI components (health badge, metrics panel, policy settings, alerts page)
5. Wire into dashboard + routing
6. Cron setup (via insert tool)

