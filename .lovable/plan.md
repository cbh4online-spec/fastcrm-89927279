

# Plan: Custom Dashboards & Widget Builder Module

## Overview

Build a configurable reports/dashboards system inspired by Basepoint, where users can create custom dashboards with data visualization widgets. This sits alongside the existing Sales Performance page and other report sub-pages.

## Current State

The project already has:
- `/dashboard/reports` — `ReportsOverview` page with executive KPIs and AI insights
- `/dashboard/reports/sales` — `ReportsSales` with 10 hardcoded chart components (LeadFlowChart, WonRevenueChart, ConversionFunnel, etc.)
- Several sub-report pages (forecasts, consumption, retention, KPIs, growth, goals)
- `useSalesPerformance` hook that queries opportunities, leads, proposals, pipeline_stages, profiles
- Reusable `PageHeader` and `Toolbar` components
- Recharts already installed for charting

**What's missing:** No concept of user-created dashboards or configurable widgets. All current reports are hardcoded.

## Database Schema

Two new tables:

### `report_dashboards`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK → workspaces | |
| name | text NOT NULL | e.g. "Sales Performance" |
| description | text | Editable subtitle |
| is_default | boolean DEFAULT false | Seed one default |
| created_by | uuid FK → auth.users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `report_widgets`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| dashboard_id | uuid FK → report_dashboards ON DELETE CASCADE | |
| title | text NOT NULL | |
| chart_type | text | 'bar', 'bar_stacked', 'line', 'funnel' |
| dataset | text | 'deals', 'leads', 'companies', 'people' |
| metric | text | 'count', 'sum', 'avg' |
| value_field | text | e.g. 'value', 'amount' |
| group_by | text | 'month', 'week', 'source', 'stage', 'owner' |
| filters | jsonb DEFAULT '{}' | Local widget filters |
| layout_order | integer DEFAULT 0 | Position in grid |
| layout_size | text DEFAULT 'md' | 'sm', 'md', 'lg' (1/3, 1/2, full width) |
| created_by | uuid FK → auth.users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: workspace-scoped via `report_dashboards.workspace_id` membership check.

Seed: Insert a default "Sales Performance" dashboard with 5 widgets matching the Basepoint layout.

## New Pages & Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard/reports/dashboards` | `ReportsDashboards.tsx` | List all dashboards + "New report" button |
| `/dashboard/reports/dashboards/:id` | `ReportDashboardView.tsx` | View a dashboard with its widget grid |

The existing `/dashboard/reports` overview stays intact. A new "Dashboards" link is added to the overview quick links section.

## New Components

```
src/components/reports/dashboards/
├── DashboardsListPage.tsx      — Grid of dashboard cards + create button
├── DashboardGrid.tsx           — Responsive grid rendering widgets
├── WidgetCard.tsx              — Individual chart card with ... menu (Edit/Duplicate/Remove)
├── WidgetRenderer.tsx          — Maps chart_type + data → Recharts component
├── CreateWidgetModal.tsx       — Form: chart type, dataset, metric, group_by, filters
├── DashboardFiltersBar.tsx     — Global date range + owner filter
└── CreateDashboardDialog.tsx   — Simple name + description dialog
```

## New Hooks

### `useReportDashboards.ts`
- `useReportDashboards()` — list dashboards for workspace
- `useCreateDashboard()` — insert dashboard
- `useDeleteDashboard()` — delete dashboard

### `useReportWidgets.ts`
- `useReportWidgets(dashboardId)` — list widgets for a dashboard
- `useCreateWidget()` — insert widget
- `useUpdateWidget()` — update widget config
- `useDuplicateWidget()` — clone widget
- `useDeleteWidget()` — remove widget

### `useWidgetData.ts`
- `useWidgetData(widget, globalFilters)` — query engine that reads the widget config (dataset, metric, value_field, group_by, filters) and runs the appropriate Supabase query, returning chart-ready data
- Supported datasets: `deals` → `opportunities`, `leads` → `leads`, `companies` → `companies`, `people` → `contacts`
- Aggregations: count (`.select('id', { count: 'exact' })`), sum/avg (client-side from fetched rows, filtered)

## Widget Rendering

`WidgetRenderer` maps `chart_type` to Recharts:
- `bar` → `<BarChart>` with single bars
- `bar_stacked` → `<BarChart>` with stacked bars by source/stage
- `line` → `<LineChart>` (V2 but already supported)
- `funnel` → Custom funnel using horizontal bars (same pattern as existing `ConversionFunnel` component)

## UI/Design

- Clean cards with light border and rounded corners (existing Card component)
- Responsive grid: widgets placed via `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with layout_size controlling `col-span`
- Each `WidgetCard` has a "..." DropdownMenu with Edit, Duplicate, Remove actions
- Skeleton loading state per widget
- Neutral palette + blue accent for charts (matching existing theme)
- Dashboard page has: Title (editable), Description (editable), FiltersBar, Grid

## Create Widget Modal Flow

1. Select chart type (visual picker: bar, stacked bar, line, funnel)
2. Select dataset (Deals, Leads, Companies, People)
3. Select metric (Count, Sum, Avg) — Sum/Avg only for numeric fields
4. Select value field (dropdown based on dataset — e.g. Deals: value/amount)
5. Select group_by (month, week, source, stage, owner)
6. Optional: local filters (status, date range)
7. Save → inserts into `report_widgets`, refetch grid

## Seed Data

Default "Sales Performance" dashboard with 5 widgets:
1. Weekly MQL Flow by Source — `bar_stacked`, `leads`, `count`, group_by `week`
2. Closed Won New ARR by Month — `bar`, `deals`, `sum`, value_field `value`, group_by `month`, filter `status=closed_won`
3. Total ARR by Month — `line`, `deals`, `sum`, value_field `value`, group_by `month`
4. Pipeline Conversion This Quarter — `funnel`, `deals`, `count`, group_by `stage`, filter `date_range=current_quarter`
5. Pipeline Conversion Last Quarter — `funnel`, `deals`, `count`, group_by `stage`, filter `date_range=last_quarter`

## Integration with Existing Reports

- The existing `ReportsOverview` page gets a new "Dashboards" quick link card
- The `ReportsSales` page remains as-is (it's the hardcoded expert view)
- Nav item `/dashboard/reports` continues to point to overview; dashboards are a sub-route

## Files Changed

| File | Change |
|------|--------|
| DB Migration | Create `report_dashboards` + `report_widgets` tables with RLS |
| `src/pages/ReportsDashboards.tsx` | NEW — List page |
| `src/pages/ReportDashboardView.tsx` | NEW — Single dashboard view |
| `src/components/reports/dashboards/*.tsx` | NEW — 7 components |
| `src/hooks/useReportDashboards.ts` | NEW — Dashboard CRUD |
| `src/hooks/useReportWidgets.ts` | NEW — Widget CRUD |
| `src/hooks/useWidgetData.ts` | NEW — Query engine for widget data |
| `src/App.tsx` | Add 2 new routes |
| `src/pages/ReportsOverview.tsx` | Add "Dashboards" quick link |

## Permissions (MVP)

All workspace members can view dashboards and widgets. Only the creator can edit/delete (enforced in UI, RLS allows all workspace members).

## Out of Scope

- Drag-and-drop reordering
- CSV/PDF export
- Scheduled email/Slack reports
- A/B testing
- Advanced permissions/sharing

